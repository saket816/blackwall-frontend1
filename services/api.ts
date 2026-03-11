import { BackendResponse } from '../types';
import { API_BASE_URL, DB_API_BASE_URL, RAILWAY_API_BASE_URL, RENDER_API_BASE_URL } from '../constants';

const isDebugApiEnabled = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem('debug_api') === '1';
  } catch {
    return false;
  }
};

const logApiCall = (name: string, url: string, details?: Record<string, any>) => {
  if (!isDebugApiEnabled()) return;
  if (details) {
    console.log(`[API] ${name}`, { url, ...details });
    return;
  }
  console.log(`[API] ${name}`, { url });
};

/**
 * Sends a prompt to the custom backend API.
 * Endpoint: POST /prompt
 * Body: { "prompt": string }
 */
export const sendPromptToBackend = async (prompt: string): Promise<string> => {
  try {
    logApiCall('sendPromptToBackend', `${API_BASE_URL}/prompt`, { prompt });
    const response = await fetch(`${API_BASE_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data: BackendResponse = await response.json();

    if (typeof data.response !== 'string') {
      throw new Error('Invalid response format: Missing "response" field');
    }

    return data.response;
  } catch (error) {
    console.error("Failed to fetch from backend:", error);
    throw error;
  }
};

/**
 * Sends a prompt to the custom backend API for satellite parsing.
 * Endpoint: POST /parse-satellite
 * Body: { "prompt": string }
 */
export const parseSatellitePrompt = async (prompt: string): Promise<any> => {
  try {
    logApiCall('parseSatellitePrompt', `${API_BASE_URL}/parse-satellite`, { prompt });
    const response = await fetch(`${API_BASE_URL}/parse-satellite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.parsed_data);
  } catch (error) {
    console.error("Failed to parse satellite prompt:", error);
    throw error;
  }
};

// ============================================================================
// Analysis API - Live Job-Based Satellite Analysis
// Base: https://blackwall-hotspot-v2.onrender.com
// ============================================================================

/**
 * Submits a satellite analysis job.
 * Endpoint: POST /api/v1/analyze
 */
export const submitSatelliteAnalysis = async (data: any): Promise<any> => {
  try {
    logApiCall('submitSatelliteAnalysis', `${RENDER_API_BASE_URL}/api/v1/analyze`, { data });
    const response = await fetch(`${RENDER_API_BASE_URL}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to submit analysis:", error);
    throw error;
  }
};

/**
 * Gets the status of an analysis job.
 * Endpoint: GET /api/v1/status/{jobId}
 */
export const getAnalysisStatus = async (jobId: string): Promise<any> => {
  try {
    logApiCall('getAnalysisStatus', `${RENDER_API_BASE_URL}/api/v1/status/${jobId}`, { jobId });
    const response = await fetch(`${RENDER_API_BASE_URL}/api/v1/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get job status:", error);
    throw error;
  }
};

/**
 * Gets the full analysis report.
 * Endpoint: GET /api/v1/report/{jobId}
 */
export const getAnalysisReport = async (jobId: string): Promise<any> => {
  try {
    logApiCall('getAnalysisReport', `${RENDER_API_BASE_URL}/api/v1/report/${jobId}`, { jobId });
    const response = await fetch(`${RENDER_API_BASE_URL}/api/v1/report/${jobId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Report not ready or found for job: ${jobId}`);
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch report for job ${jobId}:`, error);
    throw error;
  }
};

// ============================================================================
// Database API - Pre-computed Delhi & Dubai Data
// Base: https://blackwall-db-api.onrender.com
// ============================================================================

/**
 * Gets all locations for a city.
 * Endpoint: GET /v2/locations?city=Delhi
 */
export const getLocations = async (options?: {
  limit?: number;
  min_score?: number;
  city?: string;
}): Promise<any> => {
  try {
    const params = new URLSearchParams();
    params.append('city', options?.city || 'Delhi');
    if (options?.min_score) params.append('min_score', options.min_score.toString());

    const url = `${DB_API_BASE_URL}/v2/locations?${params.toString()}`;
    logApiCall('getLocations', url, { options });

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Apply client-side limit if specified
    if (options?.limit && Array.isArray(data)) {
      return data.slice(0, options.limit);
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    throw error;
  }
};

/**
 * Gets top N locations for a city, sorted by score.
 * Endpoint: GET /v2/locations?city=Delhi
 */
export const getTopLocations = async (limit: number = 10, city: string = 'Delhi'): Promise<any> => {
  try {
    const url = `${DB_API_BASE_URL}/v2/locations?city=${encodeURIComponent(city)}`;
    logApiCall('getTopLocations', url, { limit, city });

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Sort by total_score descending, then slice to limit
    if (Array.isArray(data)) {
      return data
        .sort((a: any, b: any) => (b.total_score ?? 0) - (a.total_score ?? 0))
        .slice(0, limit);
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch top locations:", error);
    throw error;
  }
};

/**
 * Gets a specific location by name.
 * Endpoint: GET /v2/locations?city=Delhi (then filter client-side)
 */
export const getLocationByName = async (locationName: string, city: string = 'Delhi'): Promise<any> => {
  try {
    const url = `${DB_API_BASE_URL}/v2/locations?city=${encodeURIComponent(city)}`;
    logApiCall('getLocationByName', url, { locationName });

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const match = Array.isArray(data)
      ? data.find((l: any) => l.name?.toLowerCase() === locationName.toLowerCase())
      : null;

    if (!match) {
      throw new Error(`Location not found: ${locationName}`);
    }
    return match;
  } catch (error) {
    console.error(`Failed to fetch location ${locationName}:`, error);
    throw error;
  }
};

/**
 * Gets shops, optionally filtered by city and brand category.
 * Endpoint: GET /v2/shops?city=Delhi&brand_category=luxury_brands
 */
export const getShops = async (options?: {
  limit?: number;
  brand_category?: string;
  city?: string;
}): Promise<any> => {
  try {
    const params = new URLSearchParams();
    params.append('city', options?.city || 'Delhi');
    if (options?.brand_category) params.append('brand_category', options.brand_category);

    const url = `${DB_API_BASE_URL}/v2/shops?${params.toString()}`;
    logApiCall('getShops', url, { options });

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (options?.limit && Array.isArray(data)) {
      return data.slice(0, options.limit);
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    throw error;
  }
};

/**
 * Gets shops filtered by brand name (client-side filter from /v2/shops).
 * Endpoint: GET /v2/shops?city=Delhi
 */
export const getShopsByBrand = async (brandName: string, city: string = 'Delhi'): Promise<any> => {
  try {
    const url = `${DB_API_BASE_URL}/v2/shops?city=${encodeURIComponent(city)}`;
    logApiCall('getShopsByBrand', url, { brandName });

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const filtered = Array.isArray(data)
      ? data.filter((s: any) =>
          s.matched_brand?.toLowerCase().includes(brandName.toLowerCase()) ||
          s.name?.toLowerCase().includes(brandName.toLowerCase())
        )
      : data;

    if (Array.isArray(filtered) && filtered.length === 0) {
      throw new Error(`No shops found for brand: ${brandName}`);
    }
    return filtered;
  } catch (error) {
    console.error(`Failed to fetch shops for brand ${brandName}:`, error);
    throw error;
  }
};

/**
 * Gets brand clusters / compare data.
 * Endpoint: GET /v2/compare?cities=Delhi,Dubai
 */
export const getClusters = async (): Promise<any> => {
  try {
    const url = `${DB_API_BASE_URL}/v2/compare?cities=Delhi,Dubai`;
    logApiCall('getClusters', url);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch clusters:", error);
    throw error;
  }
};