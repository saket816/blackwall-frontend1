import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star, Download, X } from 'lucide-react';

interface SatelliteReportViewProps {
    report: any;
    onClose?: () => void;
}

export const SatelliteReportView: React.FC<SatelliteReportViewProps> = ({ report, onClose }) => {
    const [showRawData, setShowRawData] = useState(true);
    const [activeTab, setActiveTab] = useState<'metro' | 'brands' | 'amenities' | 'roads'>('metro');

    const { analysis } = report;
    if (!analysis) return null;

    const { final_score, score_breakdown, data_summary, raw_data } = analysis;

    // Flatten all amenities into a single list
    const getAllAmenities = () => {
        if (!raw_data?.amenities?.amenities_by_category) return [];
        const all: any[] = [];
        for (const [category, items] of Object.entries(raw_data.amenities.amenities_by_category)) {
            if (Array.isArray(items)) {
                items.forEach((item: any) => {
                    all.push({ ...item, category });
                });
            }
        }
        return all;
    };

    const amenitiesList = getAllAmenities();

    // Flatten road width data
    const getRoadWidthData = () => {
        if (!raw_data?.road_network?.width_analysis?.width_by_type) return [];
        const data: any[] = [];
        for (const [type, details] of Object.entries(raw_data.road_network.width_analysis.width_by_type)) {
            if (typeof details === 'object' && details !== null) {
                data.push({
                    type,
                    total_length: (details as any).total_length,
                    avg_width: (details as any).avg_width,
                });
            }
        }
        return data;
    };

    const roadWidthData = getRoadWidthData();

    // Helper to escape CSV values
    const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Download report as CSV
    const downloadReport = () => {
        let csv = '';

        // Summary Section
        csv += 'SATELLITE ANALYSIS REPORT\n';
        csv += `Generated,${new Date().toISOString()}\n\n`;

        csv += 'SUMMARY\n';
        csv += `Total Score,${final_score?.total_points}/${final_score?.max_points}\n`;
        csv += `Classification,${escapeCSV(final_score?.classification)}\n\n`;

        // Data Summary
        if (data_summary) {
            csv += 'DATA SUMMARY\n';
            csv += 'Metric,Value\n';
            Object.entries(data_summary).forEach(([key, val]) => {
                csv += `${escapeCSV(key.replace(/_/g, ' '))},${escapeCSV(val)}\n`;
            });
            csv += '\n';
        }

        // Score Breakdown
        csv += 'SCORE BREAKDOWN\n';
        csv += 'Category,Score,Max,Details\n';
        if (score_breakdown?.roads) {
            const details = score_breakdown.roads.details ? Object.entries(score_breakdown.roads.details).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
            csv += `Roads,${score_breakdown.roads.score},${score_breakdown.roads.max},${escapeCSV(details)}\n`;
        }
        if (score_breakdown?.commercial) {
            const details = score_breakdown.commercial.details ? Object.entries(score_breakdown.commercial.details).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
            csv += `Commercial,${score_breakdown.commercial.score},${score_breakdown.commercial.max},${escapeCSV(details)}\n`;
        }
        if (score_breakdown?.amenities) {
            const details = score_breakdown.amenities.details ? Object.entries(score_breakdown.amenities.details).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
            csv += `Amenities,${score_breakdown.amenities.score},${score_breakdown.amenities.max},${escapeCSV(details)}\n`;
        }
        csv += '\n';

        // Metro Stations
        csv += 'METRO STATIONS\n';
        csv += '#,Station Name,Distance (km),Latitude,Longitude\n';
        raw_data?.metro_stations?.stations?.forEach((station: any, idx: number) => {
            csv += `${idx + 1},${escapeCSV(station.name)},${station.distance_km?.toFixed(3)},${station.latitude?.toFixed(6)},${station.longitude?.toFixed(6)}\n`;
        });
        csv += '\n';

        // Matched Brands
        csv += 'MATCHED BRANDS\n';
        csv += '#,Shop Name,Matched Brand,Category,Rating,Place ID\n';
        raw_data?.commercial?.matched_brand_details?.forEach((brand: any, idx: number) => {
            csv += `${idx + 1},${escapeCSV(brand.shop_name)},${escapeCSV(brand.matched_brand)},${escapeCSV(brand.category)},${brand.rating || ''},${escapeCSV(brand.place_id)}\n`;
        });
        csv += '\n';

        // Amenities
        csv += 'AMENITIES\n';
        csv += '#,Name,Category,Type,Vicinity,Rating\n';
        amenitiesList.forEach((item: any, idx: number) => {
            csv += `${idx + 1},${escapeCSV(item.name)},${escapeCSV(item.category)},${escapeCSV(item.type)},${escapeCSV(item.vicinity)},${item.rating || ''}\n`;
        });
        csv += '\n';

        // Roads
        csv += 'ROAD NETWORK\n';
        csv += '#,Road Type,Total Length (km),Avg Width (m)\n';
        roadWidthData.forEach((road: any, idx: number) => {
            csv += `${idx + 1},${escapeCSV(road.type)},${road.total_length?.toFixed(2)},${road.avg_width?.toFixed(2)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `satellite_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col">
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-white/10 bg-gray-900">
                <h2 className="text-xl font-bold text-white">Satellite Analysis Report</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadReport}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                        <Download size={16} />
                        Download Report
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-10 h-10 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors"
                            title="Close Report"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex gap-4 mb-6">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex-1">
                        <span className="text-gray-400 text-xs uppercase tracking-wider">Total Score</span>
                        <div className="text-3xl font-bold text-white mt-1">
                            {final_score?.total_points}<span className="text-lg text-gray-500"> / {final_score?.max_points}</span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex-1">
                        <span className="text-gray-400 text-xs uppercase tracking-wider">Classification</span>
                        <div className={`text-2xl font-bold mt-1 ${final_score?.classification?.includes('Hotspot') ? 'text-orange-400' : 'text-blue-400'}`}>
                            {final_score?.classification}
                        </div>
                    </div>
                    {data_summary && Object.entries(data_summary).slice(0, 4).map(([key, val]: any) => (
                        <div key={key} className="bg-white/5 p-4 rounded-lg border border-white/10 flex-1">
                            <span className="text-gray-400 text-xs uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                            <div className="text-2xl font-bold text-white mt-1">{String(val)}</div>
                        </div>
                    ))}
                </div>

                {/* Score Breakdown - Horizontal Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* Roads */}
                    {score_breakdown?.roads && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-blue-300">Roads & Connectivity</span>
                                <span className="font-mono text-blue-300 text-lg">{score_breakdown.roads.score}/{score_breakdown.roads.max}</span>
                            </div>
                            <div className="text-xs text-gray-300 space-y-1">
                                {score_breakdown.roads.details && Object.entries(score_breakdown.roads.details).map(([key, val]: any) => (
                                    <div key={key} className="flex justify-between">
                                        <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="font-mono">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Commercial */}
                    {score_breakdown?.commercial && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-yellow-300">Commercial & Business</span>
                                <span className="font-mono text-yellow-300 text-lg">{score_breakdown.commercial.score}/{score_breakdown.commercial.max}</span>
                            </div>
                            <div className="text-xs text-gray-300 space-y-1">
                                {score_breakdown.commercial.details && Object.entries(score_breakdown.commercial.details).map(([key, val]: any) => (
                                    <div key={key} className="flex justify-between">
                                        <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="font-mono">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Amenities */}
                    {score_breakdown?.amenities && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-green-300">Amenities & Infrastructure</span>
                                <span className="font-mono text-green-300 text-lg">{score_breakdown.amenities.score}/{score_breakdown.amenities.max}</span>
                            </div>
                            <div className="text-xs text-gray-300 space-y-1">
                                {score_breakdown.amenities.details && Object.entries(score_breakdown.amenities.details).map(([key, val]: any) => (
                                    <div key={key} className="flex justify-between">
                                        <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="font-mono">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Summary - Full Width Row */}
                {data_summary && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                        <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Data Summary</h3>
                        <div className="flex flex-wrap gap-6">
                            {Object.entries(data_summary).map(([key, val]: any) => (
                                <div key={key} className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">{key.replace(/_/g, ' ')}:</span>
                                    <span className="text-white font-mono font-semibold">{String(val)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Raw Data Toggle */}
                <div className="border-t border-white/10 pt-4">
                    <button
                        onClick={() => setShowRawData(!showRawData)}
                        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors mb-4"
                    >
                        {showRawData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {showRawData ? 'Hide Raw Data Tables' : 'Show Raw Data Tables'}
                    </button>

                    {showRawData && (
                        <div className="bg-black/30 rounded-lg border border-white/10 overflow-hidden">
                            {/* Tabs */}
                            <div className="flex border-b border-white/10 bg-white/5">
                                <button
                                    onClick={() => setActiveTab('metro')}
                                    className={`py-3 px-6 text-sm font-medium ${activeTab === 'metro' ? 'text-white bg-blue-500/20 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                                >
                                    METRO ({raw_data?.metro_stations?.stations?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab('brands')}
                                    className={`py-3 px-6 text-sm font-medium ${activeTab === 'brands' ? 'text-white bg-yellow-500/20 border-b-2 border-yellow-500' : 'text-gray-400 hover:text-white'}`}
                                >
                                    BRANDS ({raw_data?.commercial?.matched_brand_details?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab('amenities')}
                                    className={`py-3 px-6 text-sm font-medium ${activeTab === 'amenities' ? 'text-white bg-green-500/20 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}
                                >
                                    AMENITIES ({amenitiesList.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('roads')}
                                    className={`py-3 px-6 text-sm font-medium ${activeTab === 'roads' ? 'text-white bg-purple-500/20 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}
                                >
                                    ROADS ({roadWidthData.length})
                                </button>
                            </div>

                            {/* Table Content - Full Width */}
                            <div className="max-h-[600px] overflow-auto">
                                {/* Metro Table */}
                                {activeTab === 'metro' && (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 text-left font-medium w-12">#</th>
                                                <th className="p-3 text-left font-medium">Station Name</th>
                                                <th className="p-3 text-right font-medium">Distance (km)</th>
                                                <th className="p-3 text-right font-medium">Latitude</th>
                                                <th className="p-3 text-right font-medium">Longitude</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {raw_data?.metro_stations?.stations?.map((station: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-white/5">
                                                    <td className="p-3 text-gray-500">{idx + 1}</td>
                                                    <td className="p-3 text-white">{station.name}</td>
                                                    <td className="p-3 text-right font-mono text-blue-300">{station.distance_km?.toFixed(3)}</td>
                                                    <td className="p-3 text-right font-mono text-gray-400">{station.latitude?.toFixed(6)}</td>
                                                    <td className="p-3 text-right font-mono text-gray-400">{station.longitude?.toFixed(6)}</td>
                                                </tr>
                                            )) || <tr><td colSpan={5} className="p-6 text-center text-gray-500">No metro data</td></tr>}
                                        </tbody>
                                    </table>
                                )}

                                {/* Brands Table */}
                                {activeTab === 'brands' && (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 text-left font-medium w-12">#</th>
                                                <th className="p-3 text-left font-medium">Shop Name</th>
                                                <th className="p-3 text-left font-medium">Matched Brand</th>
                                                <th className="p-3 text-left font-medium">Category</th>
                                                <th className="p-3 text-right font-medium">Rating</th>
                                                <th className="p-3 text-left font-medium">Place ID</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {raw_data?.commercial?.matched_brand_details?.map((brand: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-white/5">
                                                    <td className="p-3 text-gray-500">{idx + 1}</td>
                                                    <td className="p-3 text-white">{brand.shop_name}</td>
                                                    <td className="p-3 text-indigo-300">{brand.matched_brand}</td>
                                                    <td className="p-3 text-gray-400 uppercase text-xs">{brand.category?.replace(/_/g, ' ')}</td>
                                                    <td className="p-3 text-right">
                                                        <span className={`inline-flex items-center gap-1 ${brand.rating >= 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                            {brand.rating || '-'} <Star size={12} />
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-500 font-mono text-xs">{brand.place_id}</td>
                                                </tr>
                                            )) || <tr><td colSpan={6} className="p-6 text-center text-gray-500">No brands data</td></tr>}
                                        </tbody>
                                    </table>
                                )}

                                {/* Amenities Table */}
                                {activeTab === 'amenities' && (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 text-left font-medium w-12">#</th>
                                                <th className="p-3 text-left font-medium">Name</th>
                                                <th className="p-3 text-left font-medium">Category</th>
                                                <th className="p-3 text-left font-medium">Type</th>
                                                <th className="p-3 text-left font-medium">Vicinity</th>
                                                <th className="p-3 text-right font-medium">Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {amenitiesList.length > 0 ? amenitiesList.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-white/5">
                                                    <td className="p-3 text-gray-500">{idx + 1}</td>
                                                    <td className="p-3 text-white">{item.name}</td>
                                                    <td className="p-3 text-green-400 uppercase text-xs">{item.category}</td>
                                                    <td className="p-3 text-gray-400 text-xs">{item.type}</td>
                                                    <td className="p-3 text-gray-400">{item.vicinity || '-'}</td>
                                                    <td className="p-3 text-right">
                                                        {item.rating ? (
                                                            <span className={`inline-flex items-center gap-1 ${item.rating >= 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                                {item.rating} <Star size={12} />
                                                            </span>
                                                        ) : <span className="text-gray-600">-</span>}
                                                    </td>
                                                </tr>
                                            )) : <tr><td colSpan={6} className="p-6 text-center text-gray-500">No amenities data</td></tr>}
                                        </tbody>
                                    </table>
                                )}

                                {/* Roads Table */}
                                {activeTab === 'roads' && (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 text-left font-medium w-12">#</th>
                                                <th className="p-3 text-left font-medium">Road Type</th>
                                                <th className="p-3 text-right font-medium">Total Length (km)</th>
                                                <th className="p-3 text-right font-medium">Avg Width (m)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {roadWidthData.length > 0 ? roadWidthData.map((road: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-white/5">
                                                    <td className="p-3 text-gray-500">{idx + 1}</td>
                                                    <td className="p-3 text-purple-300 capitalize">{road.type.replace(/_/g, ' ')}</td>
                                                    <td className="p-3 text-right font-mono text-gray-300">{road.total_length?.toFixed(2)}</td>
                                                    <td className="p-3 text-right font-mono text-gray-300">{road.avg_width?.toFixed(2)}</td>
                                                </tr>
                                            )) : <tr><td colSpan={4} className="p-6 text-center text-gray-500">No road data</td></tr>}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
