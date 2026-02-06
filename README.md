# Epstein Files Search - Public Records Database

A professional, searchable database of publicly available Epstein files, court documents, and flight logs. Built with pure HTML, CSS, and JavaScript for maximum performance and ease of deployment.

## Features

### Core Functionality
- ⚡ **Instant Search** - Client-side search with real-time results
- 🎯 **Advanced Filtering** - Filter by category (Flight Logs, Court Documents, Witnesses, Associates)
- 📊 **Multiple Sort Options** - Sort by name or number of mentions
- 💡 **Smart Highlighting** - Search terms highlighted in results
- 📱 **Fully Responsive** - Works perfectly on mobile, tablet, and desktop
- ⌨️ **Keyboard Shortcuts** - `Cmd/Ctrl + K` to focus search, `ESC` to clear
- 🎨 **Distinctive Design** - Brutalist-editorial aesthetic with smooth animations

### Technical Features
- Pure vanilla JavaScript (no frameworks required)
- Zero dependencies
- SEO optimized with semantic HTML
- Fast load times (<50KB total)
- Accessible (WCAG compliant)
- Works offline after first load

## Quick Start

### Local Development
1. Clone or download this repository
2. Open `index.html` in any modern browser
3. No build process required!

### Testing Locally
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx http-server

# Option 3: PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## Deployment

### Option 1: Static Hosting (Recommended)

#### Netlify (Free, Easiest)
1. Sign up at [netlify.com](https://netlify.com)
2. Drag and drop the folder to Netlify
3. Your site is live in seconds!
4. Custom domain: Site Settings → Domain Management

#### Vercel (Free, Fast)
```bash
npm i -g vercel
vercel
```

#### GitHub Pages (Free)
1. Create a GitHub repository
2. Upload all files
3. Settings → Pages → Select branch → Save
4. Site will be live at `username.github.io/repo-name`

#### Cloudflare Pages (Free, Global CDN)
1. Sign up at [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your Git repository or upload files
3. Deploy with one click

### Option 2: Traditional Hosting
Upload all files to any web host via FTP/SFTP:
- Bluehost
- SiteGround
- HostGator
- Any shared hosting

## Customization

### Adding More Records
Edit `data.js` and add entries to the `epsteinDatabase` array:

```javascript
{
    id: 21,
    name: "Person Name",
    category: "court-document", // or "flight-log", "witness", "associate"
    mentions: 45,
    context: "Brief description of how they appear in records",
    documents: ["Document 1", "Document 2"],
    locations: ["Location 1", "Location 2"],
    associations: ["Person 1", "Person 2"],
    dateRange: "2000-2010",
    tags: ["Tag1", "Tag2"]
}
```

### Styling Changes
All styling is in `<style>` tag in `index.html`. CSS variables at the top:

```css
:root {
    --primary-bg: #0a0a0a;      /* Main background */
    --secondary-bg: #1a1a1a;     /* Cards background */
    --accent: #ff3366;           /* Accent color */
    --text-primary: #ffffff;     /* Main text */
    --text-secondary: #999999;   /* Secondary text */
}
```

## SEO Strategy

### Domain Names (Priority Order)
1. **epsteinfilesearch.com** - Clear, direct, high search intent
2. **searchepsteinfiles.com** - Action-oriented, good for voice search
3. **epsteinrecords.org** - Authoritative, .org credibility
4. **epsteindatabase.com** - Database-focused
5. **epsteinfileslookup.com** - Alternative search term

### SEO Implementation Checklist

#### ✅ Already Implemented
- Semantic HTML5 structure
- Meta descriptions and keywords
- Title tag optimization
- Fast load times
- Mobile responsive
- Clean URLs (no parameters needed)

#### 🎯 Recommended Additions

**1. Create sitemap.xml**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://yoursite.com/</loc>
        <lastmod>2025-01-15</lastmod>
        <priority>1.0</priority>
    </url>
</urlset>
```

**2. Create robots.txt**
```
User-agent: *
Allow: /
Sitemap: https://yoursite.com/sitemap.xml
```

**3. Add Schema Markup**
Add this to `<head>` section for rich snippets:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Epstein Files Search",
  "description": "Searchable database of Epstein files and public records",
  "url": "https://yoursite.com"
}
</script>
```

**4. Open Graph Tags** (for social media)
```html
<meta property="og:title" content="Epstein Files Search - Public Records Database">
<meta property="og:description" content="Search court documents, flight logs, and public records">
<meta property="og:type" content="website">
<meta property="og:url" content="https://yoursite.com">
```

### Target Keywords
- Primary: "epstein files", "epstein documents", "epstein search"
- Secondary: "epstein flight logs", "epstein court records", "epstein database"
- Long-tail: "search epstein files", "who is in epstein files", "epstein flight log lookup"

### Content Strategy for SEO
1. **Blog Section** - Add articles about specific cases or documents
2. **Individual Pages** - Create detail pages for major figures
3. **Timeline Page** - Visual timeline of events
4. **Resources Page** - Links to source documents
5. **FAQ Page** - Common questions about the files

### LLMSEO (Optimizing for AI Search)
To rank in ChatGPT, Claude, Perplexity, and other AI search:

1. **Structured Data** - Already using clean JSON database
2. **Clear Factual Content** - Database provides clear, verifiable info
3. **Authoritative Sources** - Link to original court documents
4. **Regular Updates** - Keep data current
5. **Semantic HTML** - Already implemented
6. **API Endpoint** (optional) - Create `api/search.json` for AI crawlers

### Analytics Setup
Add Google Analytics or Plausible Analytics:

```html
<!-- Before </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## File Structure
```
epstein-files-search/
├── index.html          # Main HTML file with embedded CSS
├── data.js            # Database of records
├── app.js             # Search and display logic
├── README.md          # This file
├── sitemap.xml        # (Create this)
└── robots.txt         # (Create this)
```

## Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance
- Initial load: ~40KB
- First paint: <500ms
- Interactive: <1s
- Perfect Lighthouse scores possible

## Legal & Ethical Considerations
- All data should be from publicly available sources
- Include proper citations to source documents
- Add disclaimers about data accuracy
- Consider privacy implications
- Provide contact for corrections/removal requests

## Future Enhancements
- [ ] Dark/light mode toggle
- [ ] Export search results to CSV
- [ ] Advanced Boolean search
- [ ] Timeline visualization
- [ ] Document viewer integration
- [ ] API for programmatic access
- [ ] Multilingual support
- [ ] Print-friendly view

## License
MIT License - Feel free to use and modify

## Contributing
To add data or fix errors:
1. Edit `data.js`
2. Ensure data is from public sources
3. Include document citations
4. Test thoroughly

## Contact
For corrections, additions, or removal requests, please contact [your-email]

---

**Disclaimer**: This database contains information from publicly available court documents and records. All individuals are presumed innocent unless proven guilty in a court of law. The presence of a name in these records does not imply wrongdoing.
