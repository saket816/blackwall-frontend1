const getRuntimeApiBaseUrl = () => {
  try {
    if (typeof window !== 'undefined') {
      const override = window.localStorage?.getItem('api_base_url');
      if (override && override.trim().length > 0) return override.trim();
    }
  } catch {
    // ignore
  }
  return undefined;
};

export const API_BASE_URL =
  getRuntimeApiBaseUrl() || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ✅ NEW: Database API (pre-computed Delhi/Dubai data)
export const DB_API_BASE_URL =
  import.meta.env.VITE_DB_API_BASE_URL || 'https://blackwall-db-api.onrender.com';

// ✅ FIXED: Analysis API (live job-based analysis)
export const RENDER_API_BASE_URL =
  import.meta.env.VITE_RENDER_API_BASE_URL || 'https://blackwall-hotspot-v2.onrender.com';

// Keep Railway for backward compat if still needed
export const RAILWAY_API_BASE_URL =
  import.meta.env.VITE_RAILWAY_API_BASE_URL || 'https://web-production-fe383.up.railway.app';

export const UI_COLORS = {
  sidebar: 'bg-[#202123]',
  main: 'bg-[#343541]',
  inputInfo: 'text-[#c5c5d2]',
  userBubble: 'bg-[#343541]',
  botBubble: 'bg-[#444654]',
  border: 'border-[#d9d9e3]/10',
};// trigger
