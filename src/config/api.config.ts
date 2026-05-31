// API Configuration for EnzyXNova Frontend
// Dynamically set based on device environment

const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }

  return window.location.origin;
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  ENDPOINTS: {
    HEALTH: '/health',
    
    // Upload endpoints
    UPLOAD_PROTEIN_SEQUENCE: '/api/upload/protein-sequence',
    UPLOAD_PROTEIN_STRUCTURE: '/api/upload/protein-structure',
    UPLOAD_LIGAND: '/api/upload/ligand',
    
    // Analysis endpoints
    START_ANALYSIS: '/api/analysis/start',
    GET_STATUS: '/api/analysis/status',
    GET_RESULTS: '/api/analysis/results',
    
    // Module endpoints
    GET_DELTA_G: '/api/modules/delta-g',
    GET_DELTA_H: '/api/modules/delta-h',
    GET_ACTIVE_SITE: '/api/modules/active-site',
    GET_MECHANISM: '/api/modules/mechanism',
    GET_BINDING: '/api/modules/binding',
    GET_SPECIFICITY: '/api/modules/specificity',
    GET_STABILITY: '/api/modules/stability',
    GET_MUTATION: '/api/modules/mutation',
    GET_PATHWAY: '/api/modules/pathway',
    
    // Report endpoints
    GENERATE_REPORT: '/api/reports/generate',
    DOWNLOAD_REPORT: '/api/reports/download',
    
    // Project endpoints
    CREATE_PROJECT: '/api/projects',
    GET_PROJECT: '/api/projects',
    LIST_PROJECTS: '/api/projects/list',
    UPDATE_PROJECT: '/api/projects/update',
    DELETE_PROJECT: '/api/projects/delete'
  }
};

export default API_CONFIG;
