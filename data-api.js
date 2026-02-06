// data-api.js - Simple API wrapper for DugganUSA Epstein Files Search
// This is just a frontend - all data comes directly from the API

const API_CONFIG = {
  baseUrl: 'https://analytics.dugganusa.com/api/v1/search',
  index: 'epstein_files'
};

/**
 * Search the Epstein Files API
 * @param {string} query - Search query
 * @returns {Promise<{hits: Array, totalHits: number}>}
 */
async function searchAPI(query) {
  if (!query || query.trim().length === 0) {
    return { hits: [], totalHits: 0 };
  }
  
  const url = `${API_CONFIG.baseUrl}?q=${encodeURIComponent(query)}&indexes=${API_CONFIG.index}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    
    if (data.success && data.data) {
      return {
        hits: data.data.hits || [],
        totalHits: data.data.totalHits || 0,
        query: data.data.query
      };
    }
    
    return { hits: [], totalHits: 0 };
  } catch (error) {
    console.error(`API search failed for "${query}":`, error);
    throw error;
  }
}
