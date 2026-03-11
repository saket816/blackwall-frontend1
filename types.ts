export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  structuredData?: Record<string, any>;
  timestamp: number;
}

export interface BackendResponse {
  response: string;
  mode: string;
}

export interface ApiError {
  message: string;
}

export interface SatelliteAnalysisRequest {
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  location_name: string;
}

export interface JobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queue_position?: number | null;
  message?: string;
  estimated_wait_seconds?: number;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  elapsed_seconds?: number;
  duration_seconds?: number;
  error?: string | null;
  report_url?: string | null;
  status_url?: string;
}

// ============================================================================
// Railway API Types - Delhi Real Estate Data
// ============================================================================

export interface LocationData {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  total_score: number;
  roads_score: number;
  commercial_score: number;
  amenities_score: number;
  classification: string;
  city: string | null;
  zone: string | null;
}

export interface ShopData {
  id: number;
  name: string;
  matched_brand: string | null;
  brand_category: string | null;
  confidence: number | null;
  rating: number | null;
  latitude: number;
  longitude: number;
}

export interface ClusterData {
  location_name: string;
  latitude: number;
  longitude: number;
  total_score: number;
  luxury_count: number;
  intl_count: number;
  premium_count: number;
  total_brands: number;
  brands: string;
}

export type QueryType =
  | 'top_locations'
  | 'location_detail'
  | 'all_locations'
  | 'shops_by_brand'
  | 'all_shops'
  | 'clusters'
  | 'satellite_analysis';

export interface ParsedDelhiQuery {
  query_type: QueryType;
  location_name?: string;
  brand_name?: string;
  limit?: number;
  min_score?: number;
  sort_by?: 'luxury' | 'commercial' | 'roads' | 'amenities' | null;
  latitude?: number;
  longitude?: number;
  radius?: number;
}