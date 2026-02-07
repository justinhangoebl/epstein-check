// Cloudflare Worker — serves static assets + self-hosted CORS proxy
// The proxy bypasses Akamai bot protection using Cloudflare Browser
// Rendering (real headless Chrome) and falls back to a plain fetch
// with browser-like headers if the BROWSER binding isn't available.

import puppeteer from '@cloudflare/puppeteer';

/* ── Configuration ────────────────────────────────────────────────── */

const PROXY_PATH = '/api/proxy';

// Rate-limit: max requests per window per IP
const RATE_LIMIT = 60;
const RATE_WINDOW_SEC = 60;

// Max response body we'll relay (10 MB)
const MAX_BODY_BYTES = 10 * 1024 * 1024;

// Timeout for browser page navigation (ms)
const BROWSER_TIMEOUT = 15_000;

// Headers we send upstream so the target sees a real Chrome browser.
// Akamai's bot detection checks Sec-Fetch-*, Referer, Accept, and header
// ordering — all of these must be present and realistic.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  // Sec-Fetch headers tell the server this is a top-level navigation
  // from a browser — without these Akamai immediately blocks.
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Upgrade-Insecure-Requests': '1',
  Priority: 'u=0, i',
};

// CORS headers applied to every proxy response
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Return a JSON error with CORS headers */
function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Simple per-IP rate limiter using the CF request object */
const ipHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  let entry = ipHits.get(ip);

  if (!entry || now - entry.start > RATE_WINDOW_SEC * 1000) {
    entry = { start: now, count: 1 };
    ipHits.set(ip, entry);
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

/** Validate and normalise the target URL */
function prepareURL(raw) {
  let u = (raw || '').trim();
  if (!u) return null;

  if (u.startsWith('//')) u = 'https:' + u;
  else if (!/^https?:\/\//i.test(u)) u = 'https://' + u;

  // Collapse accidental double-slashes in the path
  const [protocol, rest] = u.split('://');
  if (rest) u = protocol + '://' + rest.replace(/\/{2,}/g, '/');

  try {
    const parsed = new URL(u);
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/* ── Proxy handler ────────────────────────────────────────────────── */

/**
 * Fetch a URL using Cloudflare Browser Rendering (real headless Chrome).
 * Akamai cannot distinguish this from a normal user's browser because
 * the TLS fingerprint, JS execution, and headers are all genuine.
 */
async function fetchWithBrowser(targetURL, env) {
  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Intercept the network response so we can grab the raw body
    // and status code instead of relying on page.content() (which
    // would give us the rendered HTML wrapper around the JSON).
    let interceptedResponse = null;

    page.on('response', (res) => {
      // Capture the response for the main document navigation
      if (res.url() === targetURL || res.url().startsWith(targetURL.split('?')[0])) {
        interceptedResponse = res;
      }
    });

    await page.goto(targetURL, {
      waitUntil: 'networkidle0',
      timeout: BROWSER_TIMEOUT,
    });

    let body, status, contentType;

    if (interceptedResponse) {
      status = interceptedResponse.status();
      contentType = interceptedResponse.headers()['content-type'] || 'text/html';
      // For JSON responses, get the buffer directly
      try {
        body = await interceptedResponse.buffer();
      } catch {
        // If buffer is no longer available, fall back to page text
        body = await page.evaluate(() => document.body?.innerText || '');
      }
    } else {
      // Fallback: extract the text content from the rendered page
      status = 200;
      contentType = 'text/html';
      body = await page.content();
    }

    return { body, status, contentType };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

/**
 * Fetch a URL with plain fetch() and browser-like headers.
 * This works for sites that don't do TLS fingerprinting but may
 * be blocked by Akamai's JA3/JA4 checks on CF Workers.
 */
async function fetchWithHeaders(targetURL) {
  const targetOrigin = new URL(targetURL).origin;
  const headers = {
    ...BROWSER_HEADERS,
    Referer: targetOrigin + '/',
    Origin: targetOrigin,
  };

  const upstreamRes = await fetch(
    new Request(targetURL, { method: 'GET', headers, redirect: 'follow' })
  );

  return upstreamRes;
}

async function handleProxy(request, env) {
  // Pre-flight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Rate-limit by IP (CF provides this header)
  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  if (isRateLimited(ip)) {
    return jsonError('Rate limit exceeded — try again shortly', 429);
  }

  // Extract the target URL from the query string
  const reqUrl = new URL(request.url);
  const targetRaw = reqUrl.searchParams.get('url');
  const targetURL = prepareURL(targetRaw);

  if (!targetURL) {
    return jsonError('Missing or invalid "url" query parameter');
  }

  try {
    // ── Strategy 1: Browser Rendering (bypasses Akamai TLS fingerprinting) ──
    if (env.BROWSER) {
      try {
        const { body, status, contentType } = await fetchWithBrowser(targetURL, env);

        const responseHeaders = new Headers({
          'Content-Type': contentType,
          ...CORS_HEADERS,
        });

        return new Response(body, { status, headers: responseHeaders });
      } catch (browserErr) {
        console.error('Browser Rendering failed, falling back to plain fetch:', browserErr);
        // Fall through to Strategy 2
      }
    }

    // ── Strategy 2: Plain fetch with browser headers ──
    const upstreamRes = await fetchWithHeaders(targetURL);

    // Guard against absurdly large payloads
    const contentLength = parseInt(upstreamRes.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonError('Upstream response too large', 502);
    }

    // Stream the body through, copying upstream headers
    const responseHeaders = new Headers();

    for (const [key, value] of upstreamRes.headers) {
      if (/^(transfer-encoding|connection|keep-alive|strict-transport-security)$/i.test(key)) continue;
      responseHeaders.set(key, value);
    }

    // Always override CORS so the browser accepts the response
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const msg = (err || {}).message || 'Unknown error';
    if (/dns|no such host/i.test(msg)) return jsonError('Invalid host', 502);
    if (/timeout/i.test(msg)) return jsonError('Request timed out', 504);
    return jsonError('Failed to fetch upstream URL', 502);
  }
}

/* ── Main entry ───────────────────────────────────────────────────── */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Redirect apex → www
    if (url.hostname === "epstein-check.org") {
      url.hostname = "www.epstein-check.org"
      return Response.redirect(url.toString(), 301)
    }



    // Route /api/proxy requests to the CORS proxy handler
    if (url.pathname === PROXY_PATH) {
      return handleProxy(request, env);
    }

    // Everything else → static assets from public/
    const response = await env.ASSETS.fetch(request);

    // Add security headers to all static responses
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};
