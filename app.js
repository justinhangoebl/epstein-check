// Main application logic with API integration
class EpsteinFilesSearch {
    constructor() {
        this.database = [];
        this.currentResults = [];
        this.documentsCache = new Map();
        this.totalApiDocuments = 0;
        this.searchInput = document.getElementById('searchInput');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.sortBy = document.getElementById('sortBy');
        this.resultsContainer = document.getElementById('results');
        this.personModal = null;
        
        this.init();
    }

    async init() {
        // Show loading state
        this.showLoading();
        
        // Try to load from API first, fall back to static data
        try {
            if (typeof loadEpsteinData === 'function') {
                this.database = await loadEpsteinData();
                // Get total documents from API
                if (typeof getTotalDocuments === 'function') {
                    this.totalApiDocuments = getTotalDocuments();
                }
                console.log('Loaded data from API:', this.database.length, 'persons,', this.totalApiDocuments, 'documents');
            } else {
                this.database = epsteinDatabase || [];
                console.log('Using static database');
            }
        } catch (error) {
            console.error('Failed to load API data, using static fallback:', error);
            this.database = epsteinDatabase || [];
        }
        
        this.currentResults = this.database;

        // Event listeners
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.categoryFilter.addEventListener('change', () => this.handleSearch());
        this.sortBy.addEventListener('change', () => this.handleSearch());

        // Create modal
        this.createPersonModal();

        // Initial render
        this.updateStats();
        this.renderResults(this.database);

        // Focus search on load
        setTimeout(() => this.searchInput.focus(), 100);
    }

    showLoading() {
        this.resultsContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading records from API...</p>
            </div>
        `;
    }

    createPersonModal() {
        const modal = document.createElement('div');
        modal.id = 'personModal';
        modal.className = 'person-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <div class="modal-header">
                    <h2 class="modal-name"></h2>
                    <div class="modal-badges"></div>
                </div>
                <div class="modal-body">
                    <div class="modal-section">
                        <h3>Overview</h3>
                        <p class="modal-context"></p>
                    </div>
                    <div class="modal-stats"></div>
                    <div class="modal-section">
                        <h3>Documents</h3>
                        <div class="modal-documents"></div>
                    </div>
                    <div class="modal-section">
                        <h3>Locations</h3>
                        <div class="modal-locations"></div>
                    </div>
                    <div class="modal-section">
                        <h3>Associations</h3>
                        <div class="modal-associations"></div>
                    </div>
                    <div class="modal-section">
                        <h3>Tags</h3>
                        <div class="modal-tags"></div>
                    </div>
                    <div class="modal-section modal-api-results">
                        <h3>Related Documents from API</h3>
                        <div class="api-documents-list"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.personModal = modal;

        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    async openPersonModal(person) {
        const modal = this.personModal;
        
        modal.querySelector('.modal-name').textContent = person.name;
        modal.querySelector('.modal-context').textContent = person.context;
        
        const badgesHtml = `
            <span class="badge badge-category">${this.formatCategory(person.category)}</span>
            <span class="badge badge-mentions">${person.mentions} mentions</span>
            <span class="badge badge-date">${person.dateRange}</span>
        `;
        modal.querySelector('.modal-badges').innerHTML = badgesHtml;
        
        modal.querySelector('.modal-stats').innerHTML = `
            <div class="modal-stat">
                <span class="stat-value">${person.mentions}</span>
                <span class="stat-label">Total Mentions</span>
            </div>
            <div class="modal-stat">
                <span class="stat-value">${person.documents.length}</span>
                <span class="stat-label">Documents</span>
            </div>
            <div class="modal-stat">
                <span class="stat-value">${person.locations.length}</span>
                <span class="stat-label">Locations</span>
            </div>
            <div class="modal-stat">
                <span class="stat-value">${person.associations.length}</span>
                <span class="stat-label">Associations</span>
            </div>
        `;
        
        // Show document details if available from API
        if (person.documentDetails && person.documentDetails.length > 0) {
            modal.querySelector('.modal-documents').innerHTML = 
                person.documentDetails.map(doc => `
                    <div class="doc-detail-item">
                        <span class="doc-id">${doc.id || 'N/A'}</span>
                        <span class="doc-type-badge">${doc.type || 'Document'}</span>
                        ${doc.preview ? `<p class="doc-preview">${this.truncateText(doc.preview, 150)}</p>` : ''}
                    </div>
                `).join('');
        } else {
            modal.querySelector('.modal-documents').innerHTML = 
                person.documents.map(doc => `<span class="tag tag-document">${doc}</span>`).join('');
        }
        
        modal.querySelector('.modal-locations').innerHTML = 
            person.locations.map(loc => `<span class="tag tag-location">${loc}</span>`).join('');
        
        modal.querySelector('.modal-associations').innerHTML = 
            person.associations.map(assoc => `
                <span class="tag tag-association clickable" data-name="${assoc}">${assoc}</span>
            `).join('');
        
        modal.querySelector('.modal-tags').innerHTML = 
            person.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        
        modal.querySelectorAll('.tag-association.clickable').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const name = e.target.dataset.name;
                this.closeModal();
                this.searchInput.value = name;
                this.handleSearch();
            });
        });
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        this.fetchPersonApiData(person);
    }

    async fetchPersonApiData(person) {
        const apiSection = this.personModal.querySelector('.modal-api-results');
        const apiList = this.personModal.querySelector('.api-documents-list');
        
        if (typeof searchAPI !== 'function') {
            apiSection.style.display = 'none';
            return;
        }
        
        apiSection.style.display = 'block';
        apiList.innerHTML = '<p class="loading-text">Searching for more documents...</p>';
        
        try {
            const result = await searchAPI(person.name);
            const hits = result.hits || result || [];
            
            if (hits && hits.length > 0) {
                apiList.innerHTML = hits.slice(0, 10).map(doc => `
                    <div class="api-document">
                        <div class="api-doc-header">
                            <span class="api-doc-id">${doc.efta_id || doc.id || 'N/A'}</span>
                            <span class="api-doc-type">${doc.doc_type || 'Document'}</span>
                        </div>
                        <p class="api-doc-preview">${this.truncateText(doc.content_preview || doc.content || 'No preview available', 200)}</p>
                    </div>
                `).join('');
            } else {
                apiList.innerHTML = '<p class="no-api-results">No additional documents found.</p>';
            }
        } catch (error) {
            console.error('Failed to fetch API data:', error);
            apiList.innerHTML = '<p class="api-error">Could not load additional documents.</p>';
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    closeModal() {
        this.personModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        const category = this.categoryFilter.value;
        const sort = this.sortBy.value;

        let filtered = this.database;
        
        if (searchTerm) {
            filtered = this.database.filter(record => {
                return (
                    record.name.toLowerCase().includes(searchTerm) ||
                    record.context.toLowerCase().includes(searchTerm) ||
                    record.locations.some(loc => loc.toLowerCase().includes(searchTerm)) ||
                    record.associations.some(assoc => assoc.toLowerCase().includes(searchTerm)) ||
                    record.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                    record.documents.some(doc => doc.toLowerCase().includes(searchTerm))
                );
            });
        }

        if (category !== 'all') {
            filtered = filtered.filter(record => record.category === category);
        }

        filtered = this.sortResults(filtered, sort);

        this.currentResults = filtered;
        this.renderResults(filtered, searchTerm);
        this.updateStats();
    }

    sortResults(results, sortType) {
        const sorted = [...results];
        
        switch(sortType) {
            case 'name-asc':
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc':
                return sorted.sort((a, b) => b.name.localeCompare(a.name));
            case 'mentions-desc':
                return sorted.sort((a, b) => b.mentions - a.mentions);
            case 'mentions-asc':
                return sorted.sort((a, b) => a.mentions - b.mentions);
            default:
                return sorted;
        }
    }

    highlightText(text, searchTerm) {
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    renderResults(results, searchTerm = '') {
        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <h2>No Results Found</h2>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            `;
            return;
        }

        const html = `
            <div class="results-grid">
                ${results.map((record, index) => {
                    const name = this.highlightText(record.name, searchTerm);
                    const categoryClass = `category-${record.category}`;
                    
                    return `
                        <div class="person-card ${categoryClass}" data-index="${index}" style="animation-delay: ${index * 0.03}s">
                            <div class="person-card-header">
                                <h3 class="person-name">${name}</h3>
                                <span class="person-mentions">${record.mentions}</span>
                            </div>
                            <div class="person-card-meta">
                                <span class="category-badge">${this.formatCategory(record.category)}</span>
                                <span class="date-badge">${record.dateRange}</span>
                            </div>
                            <p class="person-context">${this.truncateText(record.context, 80)}</p>
                            <div class="person-card-footer">
                                <div class="person-locations">
                                    ${record.locations.slice(0, 2).map(loc => `<span class="mini-tag">${loc}</span>`).join('')}
                                    ${record.locations.length > 2 ? `<span class="mini-tag more">+${record.locations.length - 2}</span>` : ''}
                                </div>
                                <button class="view-details-btn" data-person="${record.name}">View Details →</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.resultsContainer.innerHTML = html;
        
        this.resultsContainer.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const personName = btn.dataset.person;
                const person = this.database.find(p => p.name === personName);
                if (person) this.openPersonModal(person);
            });
        });
        
        this.resultsContainer.querySelectorAll('.person-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                const person = results[index];
                if (person) this.openPersonModal(person);
            });
        });
    }

    formatCategory(category) {
        const categoryMap = {
            'flight-log': 'Flight Log',
            'court-document': 'Court Document',
            'witness': 'Witness Testimony',
            'associate': 'Known Associate'
        };
        return categoryMap[category] || category;
    }

    updateStats() {
        const totalRecords = this.database.length;
        const resultsCount = this.currentResults.length;
        
        // Use real API document count if available, otherwise count from database
        let documentsCount = this.totalApiDocuments;
        if (!documentsCount) {
            const uniqueDocuments = new Set();
            this.database.forEach(record => {
                record.documents.forEach(doc => uniqueDocuments.add(doc));
            });
            documentsCount = uniqueDocuments.size;
        }

        this.animateValue('totalRecords', 0, totalRecords, 800);
        this.animateValue('resultsCount', 0, resultsCount, 600);
        this.animateValue('documentsCount', 0, documentsCount, 1000);
    }

    animateValue(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.round(current);
        }, 16);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new EpsteinFilesSearch();
    });
} else {
    new EpsteinFilesSearch();
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
        document.getElementById('searchInput').select();
    }
    
    if (e.key === 'Escape' && !document.getElementById('personModal')?.classList.contains('active')) {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchInput').dispatchEvent(new Event('input'));
    }
});
