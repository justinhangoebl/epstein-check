// data-api.js — DOJ Epstein Files API + DBpedia wrapper
// Uses the official justice.gov multimedia-search endpoint

const DOJ_API = {
  baseUrl: 'https://www.justice.gov/multimedia-search',
  // Fast external CORS proxy (Go TLS fingerprint bypasses Akamai)
  corsProxy: 'https://api.cors.lol/?url=',
  // Self-hosted fallback using CF Browser Rendering (real headless Chrome)
  browserProxy: '/api/proxy?url=',
  pageSize: 20
};

/**
 * Search DOJ Epstein files via the multimedia-search endpoint.
 *
 * Proxy strategy (in order):
 *  1. cors.lol — fast (~200ms), Go TLS passes Akamai.
 *  2. Our CF Worker (/api/proxy) — slower (~2-5s) but self-hosted.
 *     Uses Cloudflare Browser Rendering (real headless Chrome).
 *     Activated when cors.lol is rate-limited (429) or down.
 *
 * @param {string} query - search keywords
 * @param {number} [page=1] - 1-based page index
 * @returns {Promise<{hits: Array, totalHits: number, uniqueFiles: number, query: string}>}
 */
async function searchDOJ(query, page = 1) {
  if (!query || query.trim().length === 0) {
    return { hits: [], totalHits: 0, uniqueFiles: 0, query: '' };
  }

  const target = `${DOJ_API.baseUrl}?keys=${encodeURIComponent(query.trim())}&page=${page}`;

  // encodeURIComponent so the target's ?/& don't bleed into proxy params
  const corsUrl = `${DOJ_API.corsProxy}${encodeURIComponent(target)}`;
  const browserUrl = `${DOJ_API.browserProxy}${encodeURIComponent(target)}`;

  try {
    // 1) Try cors.lol first — fast
    let response;
    try {
      response = await fetch(corsUrl);
      // If rate-limited or down, fall back
      if (response.status === 429 || response.status >= 500) {
        console.warn(`cors.lol returned ${response.status}, falling back to Browser Rendering`);
        response = null;
      }
    } catch (e) {
      console.warn('cors.lol unreachable:', e.message);
      response = null;
    }

    // 2) Fallback: our self-hosted Browser Rendering proxy
    if (!response) {
      try {
        response = await fetch(browserUrl);
      } catch (e) {
        console.warn('Browser rendering unreachable:', e.message);
        response = null;
      }
    }

    // 3) Fallback: analytics.dugganusa.com API
    if (!response) {
      const dugganUrl = `https://analytics.dugganusa.com/api/v1/search?q=${encodeURIComponent(query.trim())}&indexes=epstein_files`;
      response = await fetch(dugganUrl);
      if (!response.ok) throw new Error(`Duggan API error: ${response.status}`);
      const data = await response.json();
      // Adapt Duggan API response to expected format
      const rawHits = data?.results || [];
      const totalValue = data?.total || rawHits.length;
      const uniqueFiles = rawHits.length;
      const hits = rawHits.map(h => ({
        documentId: h.documentId || '',
        fileName: h.fileName || '',
        fileUrl: h.fileUrl || '',
        contentType: h.contentType || '',
        fileSize: h.fileSize || 0,
        totalWords: h.totalWords || 0,
        totalCharacters: h.totalCharacters || 0,
        startPage: h.startPage || null,
        endPage: h.endPage || null,
        processedAt: h.processedAt || '',
        key: h.key || '',
        highlights: h.highlights || [],
        score: h.score || 0
      }));
      return {
        hits,
        totalHits: totalValue,
        uniqueFiles,
        query: query.trim()
      };
    }

    if (!response.ok) throw new Error(`DOJ API error: ${response.status}`);

    const data = await response.json();

    const rawHits = data?.hits?.hits || [];
    const totalValue = data?.hits?.total?.value || 0;
    const uniqueFiles = data?.aggregations?.unique_count?.value || 0;

    const hits = rawHits.map(h => {
      const src = h._source || {};
      const highlights = h.highlight?.content || [];

      return {
        documentId: src.documentId || '',
        fileName: src.ORIGIN_FILE_NAME || '',
        fileUrl: src.ORIGIN_FILE_URI || '',
        contentType: src.contentType || '',
        fileSize: src.fileSize || 0,
        totalWords: src.totalWords || 0,
        totalCharacters: src.totalCharacters || 0,
        startPage: src.startPage || null,
        endPage: src.endPage || null,
        processedAt: src.processedAt || '',
        key: src.key || '',
        highlights: highlights,
        score: h._score || 0
      };
    });

    return {
      hits,
      totalHits: totalValue,
      uniqueFiles,
      query: query.trim()
    };
  } catch (error) {
    console.error(`DOJ search failed for "${query}":`, error);
    throw error;
  }
}

/**
 * Check if a person appears in the DOJ Epstein files.
 * Returns a status: 'found' (red), 'incidental' (orange), or 'clear' (green).
 *
 * The algorithm scores each hit for relevance to determine whether
 * the person is genuinely mentioned vs. appearing incidentally
 * (e.g. Billie Eilish in a Napster spam email).
 *
 * @param {string} name - person name to check
 * @returns {Promise<{found: boolean, status: string, totalHits: number, uniqueFiles: number, hits: Array, relevanceScore: number, reason: string, error?: boolean}>}
 */
async function checkPersonInFiles(name) {
  try {
    const result = await searchDOJ(name, 1);

    if (result.totalHits === 0) {
      return {
        found: false, status: 'clear',
        totalHits: 0, uniqueFiles: 0, hits: [],
        relevanceScore: 0, reason: 'No documents found'
      };
    }

    // Score the relevance of the match
    const { score, reason } = scoreRelevance(name, result);

    let status;
    if (score >= 50) {
      status = 'found';       // red — genuinely present
    } else if (score > 0) {
      status = 'incidental';  // orange — mentioned but likely not relevant
    } else {
      status = 'clear';       // green — false positive / no real presence
    }

    return {
      found: result.totalHits > 0,
      status,
      totalHits: result.totalHits,
      uniqueFiles: result.uniqueFiles,
      hits: result.hits,
      relevanceScore: score,
      reason
    };
  } catch (error) {
    console.warn(`Check failed for "${name}":`, error);
    return { found: false, status: 'clear', totalHits: 0, uniqueFiles: 0, hits: [], relevanceScore: 0, reason: 'API error', error: true };
  }
}

/**
 * Score how relevant the DOJ search results are to the person.
 * Returns 0-100 where higher = more likely genuinely in the files.
 *
 * Signals:
 *  1. Volume — unique files AND total hit count (two separate axes)
 *  2. Name in <em> highlights — confirms the search engine matched
 *     the person, not some unrelated term
 *  3. Substantive-context boost — legal / case language in highlights
 *  4. Spam / incidental penalty — newsletter, music, marketing noise
 *
 * Threshold (in checkPersonInFiles):
 *   score >= 50 → "found" (red)
 *   1-49        → "incidental" (orange)
 *   0           → "clear" (green)
 */
function scoreRelevance(name, result) {
  let score = 0;
  const reasons = [];
  const nameParts = name.toLowerCase().split(/\s+/).filter(p => p.length > 2);

  // ── 1. Volume signals ───────────────────────────────────────────────
  const hits = result.totalHits || 0;

  // The DOJ aggregation may come back as 0 when unavailable.
  // Fall back to counting unique file names in the returned page of hits.
  let files = result.uniqueFiles || 0;
  if (files === 0 && result.hits.length > 0) {
    const uniqueNames = new Set(result.hits.map(h => h.fileName).filter(Boolean));
    files = uniqueNames.size || result.hits.length;
  }

  // a) Unique-file score (max 30)
  if (files >= 10)      { score += 30; reasons.push(`${files} unique files`); }
  else if (files >= 5)  { score += 22; reasons.push(`${files} unique files`); }
  else if (files >= 3)  { score += 15; reasons.push(`${files} files`); }
  else if (files >= 1)  { score += 8;  reasons.push(`${files} file(s)`); }

  // b) Total-hits score (max 25) — independent axis from file count
  if (hits >= 50)       { score += 25; reasons.push(`${hits} total mentions`); }
  else if (hits >= 20)  { score += 18; reasons.push(`${hits} mentions`); }
  else if (hits >= 10)  { score += 12; reasons.push(`${hits} mentions`); }
  else if (hits >= 5)   { score += 8;  reasons.push(`${hits} mentions`); }
  else if (hits >= 2)   { score += 4;  reasons.push(`${hits} mentions`); }

  // ── 2. Name in highlighted <em> tags ────────────────────────────────
  const allHighlights = result.hits
    .flatMap(h => h.highlights || [])
    .join(' ')
    .toLowerCase();

  // Text inside <em> tags is what the search engine actually matched
  const emMatches = allHighlights.match(/<em>([^<]+)<\/em>/g) || [];
  const emText = emMatches.map(m => m.replace(/<\/?em>/g, '').toLowerCase()).join(' ');

  const namePartsInEm = nameParts.filter(p => emText.includes(p));
  if (namePartsInEm.length === nameParts.length) {
    score += 25;
    reasons.push('full name in highlights');
  } else if (namePartsInEm.length > 0) {
    score += 12;
    reasons.push('partial name in highlights');
  } else {
    score -= 15;
    reasons.push('name not in highlighted terms');
  }

  // Also check plain highlight text for the full name as a phrase
  const plainHighlights = allHighlights.replace(/<[^>]*>/g, '');
  const fullNameLower = name.toLowerCase();
  if (plainHighlights.includes(fullNameLower)) {
    score += 10;
    reasons.push('full name in context');
  }

  // ── 3. Spam / incidental-content penalty ────────────────────────────
  const spamKeywords = [
    'unsubscribe', 'newsletter', 'subscription', 'advertisement',
    'click here', 'opt out', 'mailing list', 'napster', 'spotify',
    'itunes', 'playlist', 'album art', 'new music', 'top songs',
    'promotional', 'promo', 'coupon', 'discount', 'free trial',
    'breaking news', 'daily digest', 'automated', 'no-reply',
    'noreply', 'marketing', 'sponsored'
  ];
  const spamHits = spamKeywords.filter(kw => plainHighlights.includes(kw));
  if (spamHits.length >= 3) {
    score -= 35;
    reasons.push(`spam indicators: ${spamHits.slice(0, 3).join(', ')}`);
  } else if (spamHits.length >= 2) {
    score -= 25;
    reasons.push(`spam indicators: ${spamHits.join(', ')}`);
  } else if (spamHits.length === 1) {
    score -= 12;
    reasons.push(`possible spam: ${spamHits[0]}`);
  }

  // ── 4. Legal / case-related content boost ───────────────────────────
  const legalKeywords = [
    'deposition', 'testimony', 'subpoena', 'flight log', 'passenger',
    'witness', 'affidavit', 'indictment', 'grand jury', 'complaint',
    'massage', 'victim', 'minor', 'underage', 'recruit', 'sex',
    'trafficking', 'abuse', 'alleged', 'accused', 'defendant',
    'plaintiff', 'court', 'trial', 'counsel', 'attorney',
    'sealed', 'unsealed', 'exhibit', 'sworn'
  ];
  const legalHits = legalKeywords.filter(kw => plainHighlights.includes(kw));
  if (legalHits.length >= 3) {
    score += 20;
    reasons.push(`legal context: ${legalHits.slice(0, 4).join(', ')}`);
  } else if (legalHits.length >= 1) {
    score += 10;
    reasons.push(`legal context: ${legalHits.join(', ')}`);
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, reason: reasons.join('; ') };
}

/**
 * Search DBpedia for people matching a query.
 *
 * @param {string} query - name to search
 * @param {number} [maxResults=12] - max results to return
 * @returns {Promise<Array>}
 */
async function searchDBpediaPeople(query, maxResults = 12) {
  if (!query || query.trim().length < 2) return [];

  const url = `https://lookup.dbpedia.org/api/search?format=JSON&query=${encodeURIComponent(query.trim())}&typeName=Person&maxResults=${maxResults}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const docs = data.docs || [];

    return docs.map(doc => ({
      label: stripHTML(doc.label?.[0] || 'Unknown'),
      comment: stripHTML(doc.comment?.[0] || ''),
      types: (doc.typeName || []).filter(t => t !== 'Agent').join(', '),
      resource: doc.resource?.[0] || '',
      wikiLink: (doc.resource?.[0] || '').replace('http://dbpedia.org/resource/', 'https://en.wikipedia.org/wiki/')
    }));
  } catch (error) {
    console.error('DBpedia search failed:', error);
    return [];
  }
}

/* ── Utility helpers ────────────────────────── */

function stripHTML(str) {
  return str.replace(/<[^>]*>/g, '');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncateText(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.substring(0, max) + '…';
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}
