// Cloudflare Worker — entry point
// Handles /api/* routes server-side, everything else falls through to static assets.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── API routes ──────────────────────────────────────────────
    if (url.pathname === '/api/doj-search') {
      return handleDojSearch(request);
    }

    // ── Static assets (public/) ─────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};

// ── /api/doj-search ─────────────────────────────────────────────
// Proxies requests to justice.gov/multimedia-search (which has no CORS headers).

async function handleDojSearch(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(request.url);
  const keys = url.searchParams.get('keys') || '';
  const page = url.searchParams.get('page') || '0';

  if (!keys) {
    return Response.json({ error: 'Missing "keys" parameter' }, { status: 400 });
  }

  const dojUrl = `https://www.justice.gov/multimedia-search?keys=${encodeURIComponent(keys)}&page=${page}`;

  try {
    const resp = await fetch(dojUrl, {
      headers: {
        'User-Agent': 'EpsteinFileSearch/1.0',
        'Accept': 'application/json',
      },
    });

    if (!resp.ok) {
      return Response.json(
        { error: `DOJ returned ${resp.status}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();

    return Response.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to reach DOJ API', detail: err.message },
      { status: 502 }
    );
  }
}
