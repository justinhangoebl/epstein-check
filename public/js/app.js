// app.js — People Search (index.html)
// Search DBpedia for people, then cross-reference each against DOJ Epstein files.
// Cards turn green (not found) or red (found).

class PeopleSearch {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.resultsContainer = document.getElementById('results');
        this.statsBar = document.getElementById('statsBar');
        this.debounceTimer = null;
        this.currentPeople = [];
        this.checkedCount = 0;

        this.init();
    }

    init() {
        // Search input
        this.searchInput.addEventListener('input', () => this.onInput());

        // Suggestion buttons
        this.bindSuggestions();

        // Pre-fill from query param
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q) {
            this.searchInput.value = q;
            this.handleSearch(q);
        } else {
            setTimeout(() => this.searchInput.focus(), 100);
        }
    }

    bindSuggestions() {
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.searchInput.value = btn.dataset.query;
                this.handleSearch(btn.dataset.query);
            });
        });
    }

    onInput() {
        clearTimeout(this.debounceTimer);
        const query = this.searchInput.value.trim();

        if (query.length < 2) {
            this.showPrompt();
            return;
        }

        this.debounceTimer = setTimeout(() => this.handleSearch(query), 350);
    }

    showPrompt() {
        this.statsBar.style.display = 'none';
        this.resultsContainer.innerHTML = `
            <div class="search-prompt">
                <h2>Search for Anyone</h2>
                <p>Type a name to find people via DBpedia and cross-reference them against the Epstein files.</p>
                <div class="suggested-searches">
                    <p>Try searching for:</p>
                    <div class="search-suggestions">
                        <button class="suggestion-btn" data-query="Bill Clinton">Bill Clinton</button>
                        <button class="suggestion-btn" data-query="Prince Andrew">Prince Andrew</button>
                        <button class="suggestion-btn" data-query="Donald Trump">Donald Trump</button>
                        <button class="suggestion-btn" data-query="Bill Gates">Bill Gates</button>
                        <button class="suggestion-btn" data-query="Elon Musk">Elon Musk</button>
                        <button class="suggestion-btn" data-query="Stephen Hawking">Stephen Hawking</button>
                    </div>
                </div>
            </div>
        `;
        this.bindSuggestions();
    }

    async handleSearch(query) {
        // Show loading
        this.resultsContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Searching DBpedia for "${escapeHTML(query)}"…</p>
            </div>
        `;
        this.statsBar.style.display = 'none';

        try {
            const people = await searchDBpediaPeople(query, 12);

            if (people.length === 0) {
                this.resultsContainer.innerHTML = `
                    <div class="no-results">
                        <h2>No People Found</h2>
                        <p>DBpedia returned no results for "${escapeHTML(query)}"</p>
                    </div>
                `;
                return;
            }

            this.currentPeople = people;
            this.checkedCount = 0;

            // Show stats bar
            this.statsBar.style.display = '';
            document.getElementById('resultsCount').textContent = people.length;
            document.getElementById('checkedCount').textContent = '0';

            // Render cards in "checking" state
            this.renderCards(people);

            // Cross-check each person against DOJ files in parallel
            await this.crossCheckAll(people);

        } catch (error) {
            console.error('People search failed:', error);
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <h2>Search Failed</h2>
                    <p>Could not search DBpedia. Please try again.</p>
                </div>
            `;
        }
    }

    renderCards(people) {
        let html = '<div class="results-grid">';
        people.forEach((person, index) => {
            html += `
                <div class="person-card person-card-checking" id="person-card-${index}"
                     data-index="${index}" style="animation-delay: ${index * 0.04}s"
                     role="button" tabindex="0">
                    <div class="person-card-header">
                        <h3 class="person-name">${escapeHTML(person.label)}</h3>
                        <span class="person-status-badge checking">
                            <span class="loading-spinner tiny"></span>
                        </span>
                    </div>
                    <div class="person-card-meta">
                        ${person.types ? `<span class="category-badge">${escapeHTML(person.types)}</span>` : ''}
                    </div>
                    <p class="person-context">${escapeHTML(truncateText(person.comment, 120))}</p>
                    <div class="person-card-footer">
                        <div class="person-links">
                            ${person.wikiLink ? `<a href="${escapeAttr(person.wikiLink)}" target="_blank" rel="noopener noreferrer" class="mini-link" onclick="event.stopPropagation()">Wikipedia ↗</a>` : ''}
                        </div>
                        <span class="person-file-count" id="person-count-${index}">Checking…</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        this.resultsContainer.innerHTML = html;

        // Click handlers to open details
        this.resultsContainer.querySelectorAll('.person-card').forEach(card => {
            const handler = () => {
                const idx = parseInt(card.dataset.index);
                const person = this.currentPeople[idx];
                if (person && person._checkResult) {
                    this.openModal(person);
                }
            };
            card.addEventListener('click', handler);
            card.addEventListener('keypress', e => { if (e.key === 'Enter') handler(); });
        });
    }

    async crossCheckAll(people) {
        // Fire all checks in parallel
        const promises = people.map((person, index) =>
            checkPersonInFiles(person.label).then(result => {
                person._checkResult = result;
                this.updateCard(index, person, result);
                this.checkedCount++;
                document.getElementById('checkedCount').textContent = this.checkedCount;
            })
        );

        await Promise.allSettled(promises);
    }

    updateCard(index, person, result) {
        const card = document.getElementById(`person-card-${index}`);
        const countEl = document.getElementById(`person-count-${index}`);
        if (!card || !countEl) return;

        card.classList.remove('person-card-checking');
        const badge = card.querySelector('.person-status-badge');
        let status = result.error ? 'unreachable' : (result.status || (result.found ? 'found' : 'clear'));
        // If fallback was used and no results, mark as unreachable
        if (result.error || (result.totalHits === 0 && result.status === 'clear' && result.fallback === 'duggan')) {
            status = 'unreachable';
        }
        if (status === 'found') {
            card.classList.add('person-card-found');
            badge.className = 'person-status-badge found';
            badge.innerHTML = '⚠';
            countEl.textContent = `${result.totalHits.toLocaleString()} mentions`;
            countEl.classList.add('found-count');
        } else if (status === 'incidental') {
            card.classList.add('person-card-incidental');
            badge.className = 'person-status-badge incidental';
            badge.innerHTML = '~';
            countEl.textContent = `${result.totalHits.toLocaleString()} (incidental)`;
            countEl.classList.add('incidental-count');
        } else if (status === 'unreachable') {
            card.classList.add('person-card-unreachable');
            badge.className = 'person-status-badge unreachable';
            badge.innerHTML = '…';
            countEl.textContent = 'Endpoint unreachable or no results';
            countEl.classList.add('unreachable-count');
        } else {
            card.classList.add('person-card-clear');
            badge.className = 'person-status-badge clear';
            badge.innerHTML = '✓';
            countEl.textContent = 'Not found';
            countEl.classList.add('clear-count');
        }
    }

    openModal(person) {
        const result = person._checkResult;
        if (!result) return;

        const status = result.status || (result.found ? 'found' : 'clear');
        const statusMap = {
            found:      { css: 'checker-found',      label: 'FOUND IN FILES',  icon: '⚠' },
            incidental: { css: 'checker-incidental',  label: 'INCIDENTAL MENTION', icon: '~' },
            clear:      { css: 'checker-clear',       label: 'NOT FOUND',       icon: '✓' }
        };
        const s = statusMap[status] || statusMap.clear;
        const statusClass = s.css;
        const statusLabel = s.label;
        const statusIcon = s.icon;

        let documentsHTML = '';
        if (result.found && result.hits.length > 0) {
            const previewHits = result.hits.slice(0, 5);
            documentsHTML = `
                <div class="checker-documents">
                    <h4>Sample Documents</h4>
                    ${previewHits.map(hit => `
                        <div class="checker-doc">
                            <div class="checker-doc-header">
                                <span class="checker-doc-id">${escapeHTML(hit.fileName)}</span>
                                <span class="checker-doc-size">${formatFileSize(hit.fileSize)}</span>
                            </div>
                            ${hit.highlights.length > 0
                                ? `<p class="checker-doc-preview">${hit.highlights[0]}</p>`
                                : ''}
                            ${hit.fileUrl
                                ? `<a href="${escapeAttr(hit.fileUrl)}" target="_blank" rel="noopener noreferrer" class="checker-doc-link">View PDF ↗</a>`
                                : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="checker-actions">
                    <a href="documents.html?q=${encodeURIComponent(person.label)}" class="checker-action-btn">
                        Search all documents for "${escapeHTML(person.label)}" →
                    </a>
                </div>
            `;
        }

        // Create modal
        const overlay = document.createElement('div');
        overlay.className = 'person-modal active';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" aria-label="Close">&times;</button>
                <div class="checker-card ${statusClass}">
                    <div class="checker-status">
                        <span class="checker-status-icon">${statusIcon}</span>
                        <span class="checker-status-label">${statusLabel}</span>
                        ${result.found ? `<span class="checker-hit-count">${result.totalHits.toLocaleString()} mentions · ${result.uniqueFiles} files</span>` : ''}
                    </div>
                    ${result.reason ? `<div class="checker-reason"><span>Analysis:</span> ${escapeHTML(result.reason)}</div>` : ''}
                    <div class="checker-person-info">
                        <h3 class="checker-person-name">${escapeHTML(person.label)}</h3>
                        ${person.types ? `<div class="checker-person-types">${person.types.split(', ').map(t => `<span class="checker-type-badge">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
                        ${person.comment ? `<p class="checker-person-bio">${escapeHTML(person.comment)}</p>` : ''}
                        <div class="checker-person-links">
                            ${person.wikiLink ? `<a href="${person.wikiLink}" target="_blank" rel="noopener noreferrer" class="checker-wiki-link">Wikipedia ↗</a>` : ''}
                            ${person.resource ? `<a href="${person.resource}" target="_blank" rel="noopener noreferrer" class="checker-wiki-link">DBpedia ↗</a>` : ''}
                        </div>
                    </div>
                    ${documentsHTML}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const closeModal = () => {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => overlay.remove(), 300);
        };

        overlay.querySelector('.modal-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handler);
            }
        });

        // Focus the close button
        overlay.querySelector('.modal-close').focus();
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PeopleSearch());
} else {
    new PeopleSearch();
}

// Keyboard shortcut: Cmd/Ctrl+K to focus search
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('searchInput');
        if (input) { input.focus(); input.select(); }
    }
});

// Header scroll shrink
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});
