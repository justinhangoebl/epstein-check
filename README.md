# Epstein Files Search

Cross-reference any public figure against 115,000+ Epstein court documents from the DOJ EFTA release. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools.

**Live:** [epstein-check.org](https://epstein-check.org)

## Pages

| Page | Description |
|------|-------------|
| **People Search** (`index.html`) | Search for anyone via DBpedia and cross-reference against DOJ files. Cards turn red (found), orange (incidental), or green (clear). |
| **Document Search** (`documents.html`) | Full-text search across DOJ Epstein files with pagination and highlighted results. |
| **Checker** (`checker.html`) | Look up a single person with autocomplete and get a detailed breakdown with sample documents. |

## How It Works

1. **People are looked up via [DBpedia](https://www.dbpedia.org)** — this confirms they are real, known public figures.
2. **Each name is cross-referenced against the [DOJ Epstein files](https://www.justice.gov/epstein)** — the justice.gov multimedia-search API.
3. **A relevance algorithm scores each match** to separate genuine mentions from incidental ones (e.g. a celebrity name appearing in a spam email attachment).

### Relevance Scoring

The algorithm checks multiple signals:
- **Volume** — unique file count and total mentions
- **Name in highlights** — whether the search engine actually matched the person's name
- **Legal context** — presence of terms like *deposition*, *testimony*, *subpoena*, *victim*
- **Spam detection** — presence of terms like *unsubscribe*, *newsletter*, *napster*, *playlist*

Score ≥ 50 → **found** (red) · 1–49 → **incidental** (orange) · 0 → **clear** (green)

## Tech Stack

- Vanilla HTML, CSS, JavaScript (ES6+)
- [DOJ multimedia-search API](https://www.justice.gov/multimedia-search) (proxied via Cloudflare Worker)
- [DBpedia Lookup API](https://lookup.dbpedia.org)
- Hosted on [Cloudflare Workers](https://workers.cloudflare.com) with static assets
- Fonts: Space Mono + Crimson Pro (Google Fonts)
- Brutalist-editorial dark theme

## Project Structure

```
├── public/                     # Static assets (served by Cloudflare)
│   ├── index.html              #   People Search page
│   ├── documents.html          #   Document Search page
│   ├── checker.html            #   Single-person Checker page
│   ├── js/
│   │   ├── app.js              #   People Search logic
│   │   └── data-api.js         #   DOJ + DBpedia API wrapper, relevance scoring
│   ├── css/
│   │   └── styles.css          #   All styles
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   └── worker.js               # Cloudflare Worker entry point (handles /api/*)
├── wrangler.jsonc               # Wrangler deployment config
├── STYLE_GUIDE.md
├── LICENSE
└── README.md
```

## Run Locally

```bash
npx wrangler dev
```

This starts a local server with the `/api/doj-search` proxy and static assets working just like production.

## Deploy

```bash
npx wrangler deploy
```

Or connect the repo to Cloudflare — push triggers auto-deploy.

## Disclaimer

This tool cross-references publicly available DOJ court records. Appearance in these files does not imply wrongdoing. There is no guarantee for the correctness of this information. Use at your own discretion.

## License

[MIT](LICENSE)
