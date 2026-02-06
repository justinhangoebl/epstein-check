// Cloudflare Worker — serves static assets + self-hosted CORS proxy
// The proxy replaces the external api.cors.lol dependency so we control
// everything ourselves and avoid third-party rate limits / outages.

/* ── Configuration ────────────────────────────────────────────────── */

const PROXY_PATH = '/api/proxy';

// Rate-limit: max requests per window per IP
const RATE_LIMIT = 60;
const RATE_WINDOW_SEC = 60;

// Max response body we'll relay (10 MB)
const MAX_BODY_BYTES = 10 * 1024 * 1024;

// Headers we send upstream so the target sees a normal browser
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
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

async function handleProxy(request) {
  // Pre-flight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Rate-limit by IP (CF provides this header)
  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  if (isRateLimited(ip)) {
    return jsonError('Rate limit exceeded — try again shortly', 429);
  }

  // Extract target URL
  const url = new URL(request.url);
  const targetRaw = url.searchParams.get('url');
  const targetURL = prepareURL(targetRaw);

  if (!targetURL) {
    return jsonError('Missing or invalid "url" query parameter');
  }

  try {
    // Build the upstream request with browser-like headers so Akamai
    // and similar bot-protection layers let us through.
    const upstreamReq = new Request(targetURL, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    });

    const upstreamRes = await fetch(upstreamReq);

    // Guard against absurdly large payloads
    const contentLength = parseInt(upstreamRes.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonError('Upstream response too large', 502);
    }

    // Stream the body through, copying upstream headers
    const responseHeaders = new Headers();

    for (const [key, value] of upstreamRes.headers) {
      // Skip hop-by-hop & security headers the browser shouldn't see
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

    // Route /api/proxy requests to the CORS proxy handler
    if (url.pathname === PROXY_PATH) {
      return handleProxy(request);
    }

    // Everything else → static assets from public/
    return env.ASSETS.fetch(request);
  },
};
