import React, { useState, useEffect } from 'react';
import { User, Bot, AlertCircle, MapPin, Store, Layers } from 'lucide-react';
import { Message, Role, ParsedDelhiQuery, QueryType } from '../types';
import { DelhiReportView } from './DelhiReportView';
import { SatelliteReportView } from './SatelliteReportView';
import { UI_COLORS } from '../constants';
import {
  getLocations,
  getTopLocations,
  getLocationByName,
  getShops,
  getShopsByBrand,
  getClusters,
  submitSatelliteAnalysis,
  getAnalysisStatus,
  getAnalysisReport
} from '../services/api';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isAssistant = message.role === Role.ASSISTANT;
  const isError = message.content.startsWith('Error:');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [queryType, setQueryType] = useState<QueryType | null>(null);
  const [queryParams, setQueryParams] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInfoMessage, setIsInfoMessage] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Satellite Analysis State
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [jobResponse, setJobResponse] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const displayContent = hasAttemptedFetch && isInfoMessage && errorMessage ? errorMessage : message.content;


  // Auto-fetch data if structured data is present and no data loaded yet (SKIP for satellite)
  useEffect(() => {
    if (message.structuredData && !reportData && !errorMessage && !isLoading) {
      if (message.structuredData.query_type !== 'satellite_analysis') {
        fetchDelhiData(message.structuredData as ParsedDelhiQuery);
      } else {
        // Just set the query type so we can render the right icon/button
        setQueryType('satellite_analysis');
      }
    }
  }, []);

  // Polling for Satellite Job Status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (jobId && (jobStatus === 'queued' || jobStatus === 'processing')) {
      interval = setInterval(async () => {
        try {
          const statusData = await getAnalysisStatus(jobId);
          setJobStatus(statusData.status);

          // Update the message from status API
          if (statusData.message) {
            setStatusMessage(statusData.message);
          }

          if (statusData.status === 'completed') {
            clearInterval(interval);
            // Fetch the final report
            const report = await getAnalysisReport(jobId);
            setReportData(report);
            setIsLoading(false);
          } else if (statusData.status === 'failed') {
            clearInterval(interval);
            setErrorMessage(statusData.error || 'Analysis failed');
            setJobStatus('failed');
            setIsLoading(false);
          }
        } catch (e: any) {
          console.error("Polling error:", e);
          // Don't stop polling on transient network errors, but maybe log it
        }
      }, 10000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const startAnalysis = async () => {
    if (!message.structuredData) return;
    setIsLoading(true);
    setHasAttemptedFetch(true);
    setErrorMessage(null);
    setQueryType('satellite_analysis');

    try {
      const resp = await submitSatelliteAnalysis({
        latitude: message.structuredData.latitude,
        longitude: message.structuredData.longitude,
        radius: message.structuredData.radius || 2,
        location_name: message.structuredData.location_name
      });

      setJobId(resp.job_id);
      setJobStatus(resp.status); // usually 'queued'
      setJobResponse(resp); // Store full response for display
      setIsLoading(false);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to submit analysis");
      setIsLoading(false);
    }
  };

  const fetchDelhiData = async (parsed: ParsedDelhiQuery) => {
    setIsLoading(true);
    setHasAttemptedFetch(true);
    setErrorMessage(null);
    setIsInfoMessage(false);
    setQueryType(parsed.query_type);
    setQueryParams({
      location_name: parsed.location_name,
      brand_name: parsed.brand_name,
      limit: parsed.limit
    });

    try {
      let data;

      // Handle advanced sorting overrides
      if (parsed.sort_by) {
        if (parsed.sort_by === 'luxury') {
          // For luxury, we want cluster data sorted by luxury count
          const clusters = await getClusters();
          data = (clusters as any[]).sort((a, b) => b.luxury_count - a.luxury_count);
          setQueryType('clusters');
        } else {
          // For other scores, fetch generic locations and sort client-side
          const locations = await getLocations({ limit: 100 });

          if (parsed.sort_by === 'commercial') {
            data = (locations as any[]).sort((a, b) => b.commercial_score - a.commercial_score);
          } else if (parsed.sort_by === 'roads') {
            data = (locations as any[]).sort((a, b) => b.roads_score - a.roads_score);
          } else if (parsed.sort_by === 'amenities') {
            data = (locations as any[]).sort((a, b) => b.amenities_score - a.amenities_score);
          }

          if (parsed.limit) {
            data = data.slice(0, parsed.limit);
          } else {
            data = data.slice(0, 10);
          }
          setQueryType('top_locations');
        }
      } else {
        switch (parsed.query_type) {
          case 'top_locations':
            data = await getTopLocations(parsed.limit || 10);
            break;
          case 'location_detail':
            if (!parsed.location_name) {
              throw new Error('Location name is required');
            }
            data = await getLocationByName(parsed.location_name);
            break;
          case 'all_locations':
            data = await getLocations({
              limit: parsed.limit || 50,
              min_score: parsed.min_score
            });
            break;
          case 'shops_by_brand':
            if (!parsed.brand_name) {
              throw new Error('Brand name is required');
            }
            data = await getShopsByBrand(parsed.brand_name);
            break;
          case 'all_shops':
            data = await getShops({ limit: parsed.limit || 50 });
            break;
          case 'clusters':
            data = await getClusters();
            if (parsed.location_name && Array.isArray(data)) {
              const q = parsed.location_name.trim().toLowerCase();
              data = (data as any[]).filter((c) => {
                const name = String((c as any)?.location_name || '').toLowerCase();
                return name === q;
              });
            }
            break;
          default:
            throw new Error('Unknown query type');
        }
      }
      setReportData(data);
    } catch (error: any) {
      console.error("Fetch error:", error);
      let msg = error.message || 'Failed to fetch data';

      if (msg.includes('404') || msg.includes('not found')) {
        setIsInfoMessage(true);
        if (parsed.query_type === 'location_detail' && parsed.location_name) {
          msg = `Sorry, I couldn’t find any data for "${parsed.location_name}" right now. Try a nearby area or check the spelling.`;
        } else if (parsed.query_type === 'shops_by_brand' && parsed.brand_name) {
          msg = `Sorry, I couldn’t find any store data for "${parsed.brand_name}" right now. Try a different brand or broaden your search.`;
        } else {
          msg = 'Sorry, I couldn’t find relevant data for this request right now. Try refining the location or using a broader query.';
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Get query type icon and color
  const getQueryTypeDisplay = (type: string) => {
    switch (type) {
      case 'top_locations':
      case 'location_detail':
      case 'all_locations':
        return { icon: <MapPin size={14} />, color: 'text-blue-400', label: 'Locations' };
      case 'shops_by_brand':
      case 'all_shops':
        return { icon: <Store size={14} />, color: 'text-yellow-400', label: 'Shops' };
      case 'clusters':
        return { icon: <Layers size={14} />, color: 'text-purple-400', label: 'Clusters' };
      case 'satellite_analysis':
        return { icon: <Layers size={14} />, color: 'text-teal-400', label: 'Satellite Analysis' };
      default:
        return { icon: null, color: 'text-gray-400', label: type };
    }
  };

  return (
    <div className={`
      w-full border-b text-gray-100 
      ${isAssistant ? UI_COLORS.botBubble : UI_COLORS.userBubble} 
      ${isAssistant ? 'border-black/10' : 'border-black/10'}
      dark:border-gray-900/50
    `}>
      <div className="m-auto gap-4 p-4 md:max-w-2xl lg:max-w-3xl md:gap-6 md:py-6 flex">

        {/* Avatar */}
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className={`w-[30px] h-[30px] rounded-sm flex items-center justify-center ${isAssistant ? (isError ? 'bg-red-500' : 'bg-[#19c37d]') : 'bg-[#5436DA]'}`}>
            {isAssistant ? (
              isError ? <AlertCircle size={20} color="white" /> : <Bot size={20} color="white" />
            ) : (
              <User size={20} color="white" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1">
          {displayContent}

          {message.structuredData && (
            <div className="mt-4 flex flex-col gap-4">
              {/* Parsed Query Display */}
              <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/20">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase text-gray-400">
                    <tr>
                      {Object.keys(message.structuredData).filter(k => message.structuredData![k] !== null).map((key) => (
                        <th key={key} className="px-4 py-3 font-medium tracking-wider">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      {Object.entries(message.structuredData).filter(([_, v]) => v !== null).map(([key, value], index) => {
                        const display = key === 'query_type' ? getQueryTypeDisplay(value as string) : null;
                        return (
                          <td key={index} className="px-4 py-3 text-gray-300">
                            {display ? (
                              <span className={`inline-flex items-center gap-1 ${display.color}`}>
                                {display.icon} {display.label}
                              </span>
                            ) : (
                              String(value)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Analysis Payload Preview for Satellite/Places */}
              {message.structuredData.query_type === 'satellite_analysis' && (
                <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-4">
                  <h4 className="text-xs font-semibold uppercase text-teal-400 mb-3 flex items-center gap-2">
                    <Layers size={14} />
                    Analysis Payload
                  </h4>
                  <table className="w-full text-left text-sm mb-4">
                    <thead className="bg-white/5 text-xs uppercase text-gray-400">
                      <tr>
                        <th className="px-4 py-2">Parameter</th>
                        <th className="px-4 py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="px-4 py-2 text-gray-300">Latitude</td>
                        <td className="px-4 py-2 font-mono text-white">{message.structuredData.latitude}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-gray-300">Longitude</td>
                        <td className="px-4 py-2 font-mono text-white">{message.structuredData.longitude}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-gray-300">Radius</td>
                        <td className="px-4 py-2 font-mono text-white">{message.structuredData.radius || 2} km</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-gray-300">Location</td>
                        <td className="px-4 py-2 font-mono text-white">{message.structuredData.location_name || 'Custom'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* JSON Preview (Optional but helpful based on request "build the json payload") */}
                  <div className="bg-black/40 p-3 rounded text-xs font-mono text-gray-400 overflow-x-auto">
                    {JSON.stringify({
                      latitude: message.structuredData.latitude,
                      longitude: message.structuredData.longitude,
                      radius: message.structuredData.radius || 2,
                      location_name: message.structuredData.location_name
                    }, null, 2)}
                  </div>
                </div>
              )}

              {/* Action Area */}
              <div className="mt-2">
                {isLoading ? (
                  <div className="flex items-center gap-3 p-3 bg-black/30 rounded border border-white/10 text-sm">
                    <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-300">Fetching report data...</span>
                  </div>
                ) : reportData && queryType !== 'satellite_analysis' ? (
                  <div>
                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors shadow-lg flex items-center gap-2"
                    >
                      <Layers size={16} />
                      <span>View Report</span>
                    </button>
                  </div>
                ) : (queryType === 'satellite_analysis') ? (
                  // Satellite Specific UI
                  jobStatus === 'idle' ? (
                    <button
                      onClick={startAnalysis}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors shadow-lg flex items-center gap-2"
                    >
                      <Layers size={16} />
                      <span>Start Analysis</span>
                    </button>
                  ) : jobStatus === 'completed' && reportData ? (
                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors shadow-lg flex items-center gap-2"
                    >
                      <Layers size={16} />
                      <span>View Satellite Report</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {/* Job Response Card */}
                      {jobResponse && (
                        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
                          <h4 className="text-xs font-semibold uppercase text-indigo-400 mb-3">Job Submitted</h4>
                          <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-white/5">
                              <tr>
                                <td className="py-2 text-gray-400">Job ID</td>
                                <td className="py-2 font-mono text-white text-xs">{jobResponse.job_id}</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-gray-400">Status</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${jobStatus === 'queued' ? 'bg-yellow-500/20 text-yellow-300' :
                                    jobStatus === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                                      jobStatus === 'completed' ? 'bg-green-500/20 text-green-300' :
                                        'bg-gray-500/20 text-gray-300'
                                    }`}>
                                    {jobStatus.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                              {jobResponse.queue_position && (
                                <tr>
                                  <td className="py-2 text-gray-400">Queue Position</td>
                                  <td className="py-2 text-white">{jobResponse.queue_position}</td>
                                </tr>
                              )}
                              {(statusMessage || jobResponse.message) && (
                                <tr>
                                  <td className="py-2 text-gray-400">Message</td>
                                  <td className="py-2 text-gray-300">{statusMessage || jobResponse.message}</td>
                                </tr>
                              )}
                              {jobResponse.estimated_wait_seconds && (
                                <tr>
                                  <td className="py-2 text-gray-400">Est. Wait</td>
                                  <td className="py-2 text-gray-300">{jobResponse.estimated_wait_seconds}s</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Status Indicator */}
                      {(jobStatus === 'queued' || jobStatus === 'processing') && (
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded border border-white/10 text-sm">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="text-gray-300">{statusMessage || (jobStatus === 'queued' ? 'Waiting in queue...' : 'Processing analysis...')}</span>
                        </div>
                      )}
                    </div>
                  )
                ) : !hasAttemptedFetch ? (
                  <button
                    onClick={() => fetchDelhiData(message.structuredData as ParsedDelhiQuery)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors shadow-lg flex items-center gap-2"
                  >
                    <span>Fetch Report</span>
                  </button>
                ) : errorMessage && !isInfoMessage ? (
                  <button
                    onClick={() => fetchDelhiData(message.structuredData as ParsedDelhiQuery)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors shadow-lg flex items-center gap-2"
                  >
                    <span>Retry</span>
                  </button>
                ) : null}

                {/* Error Message */}
                {errorMessage && !isInfoMessage && (
                  <div
                    className={
                      isInfoMessage
                        ? 'mt-2 p-3 bg-white/5 border border-white/10 rounded text-gray-300 text-sm'
                        : 'mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm'
                    }
                  >
                    {isInfoMessage ? errorMessage : `Error: ${errorMessage}`}
                  </div>
                )}

                {/* Report View Modal */}


                {/* Satellite Report View Modal */}
                {isReportOpen && reportData && queryType === 'satellite_analysis' && (
                  <SatelliteReportView
                    report={reportData}
                    onClose={() => setIsReportOpen(false)}
                  />
                )}

                {/* Regular Delhi Report View Modal */}
                {isReportOpen && reportData && queryType !== 'satellite_analysis' && (
                  <DelhiReportView
                    data={reportData}
                    queryType={queryType}
                    queryParams={queryParams}
                    onClose={() => setIsReportOpen(false)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};