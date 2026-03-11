/**
 * Satellite Report Cache - stores last 2 reports in localStorage
 */

const CACHE_KEY = 'satellite_report_cache';
const MAX_CACHE_SIZE = 2;

interface CacheEntry {
    payload: {
        latitude: number;
        longitude: number;
        radius: number;
        location_name: string;
    };
    report: any;
    timestamp: number;
}

/**
 * Generates a cache key from payload values
 */
const generatePayloadKey = (payload: CacheEntry['payload']): string => {
    return `${payload.latitude}_${payload.longitude}_${payload.radius}_${payload.location_name}`;
};

/**
 * Gets cached reports from localStorage
 */
const getCache = (): CacheEntry[] => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    } catch {
        return [];
    }
};

/**
 * Saves cache to localStorage
 */
const saveCache = (cache: CacheEntry[]): void => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.error('Failed to save cache:', error);
    }
};

/**
 * Checks if a cached report exists for the given payload
 */
export const getCachedReport = (payload: CacheEntry['payload']): any | null => {
    const cache = getCache();
    const payloadKey = generatePayloadKey(payload);

    const entry = cache.find(item => generatePayloadKey(item.payload) === payloadKey);

    if (entry) {
        console.log('Cache hit for satellite report:', payloadKey);
        return entry.report;
    }

    console.log('Cache miss for satellite report:', payloadKey);
    return null;
};

/**
 * Saves a report to cache (keeps last 2 entries)
 */
export const cacheReport = (payload: CacheEntry['payload'], report: any): void => {
    const cache = getCache();
    const payloadKey = generatePayloadKey(payload);

    // Remove existing entry for same payload if exists
    const filteredCache = cache.filter(item => generatePayloadKey(item.payload) !== payloadKey);

    // Add new entry at the beginning
    const newEntry: CacheEntry = {
        payload,
        report,
        timestamp: Date.now()
    };

    filteredCache.unshift(newEntry);

    // Keep only last MAX_CACHE_SIZE entries
    const trimmedCache = filteredCache.slice(0, MAX_CACHE_SIZE);

    saveCache(trimmedCache);
    console.log('Cached satellite report:', payloadKey);
};

/**
 * Clears the report cache
 */
export const clearReportCache = (): void => {
    localStorage.removeItem(CACHE_KEY);
    console.log('Satellite report cache cleared');
};
