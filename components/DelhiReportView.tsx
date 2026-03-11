import React, { useState } from 'react';
import { Download, X, MapPin, Store, Layers, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { LocationData, ShopData, ClusterData, QueryType } from '../types';

interface DelhiReportViewProps {
    data: LocationData[] | ShopData[] | ClusterData[] | LocationData;
    queryType: QueryType;
    queryParams?: {
        location_name?: string;
        brand_name?: string;
        limit?: number;
    };
    onClose?: () => void;
    warningMessage?: string;
}

export const DelhiReportView: React.FC<DelhiReportViewProps> = ({ data, queryType, queryParams, onClose, warningMessage }) => {
    const [activeTab, setActiveTab] = useState<'data' | 'summary'>('data');

    // Type guards
    const isLocationArray = (d: any): d is LocationData[] => Array.isArray(d) && d.length > 0 && 'total_score' in d[0] && 'roads_score' in d[0];
    const isShopArray = (d: any): d is ShopData[] => Array.isArray(d) && d.length > 0 && 'matched_brand' in d[0];
    const isClusterArray = (d: any): d is ClusterData[] => Array.isArray(d) && d.length > 0 && 'luxury_count' in d[0];
    const isSingleLocation = (d: any): d is LocationData => !Array.isArray(d) && 'total_score' in d;

    // Get title based on query type
    const getTitle = () => {
        switch (queryType) {
            case 'top_locations': return `Top ${queryParams?.limit || 10} Locations in Delhi`;
            case 'location_detail': return `Location: ${queryParams?.location_name || 'Details'}`;
            case 'all_locations': return 'All Delhi Locations';
            case 'shops_by_brand': return `${queryParams?.brand_name || 'Brand'} Stores`;
            case 'all_shops': return 'All Shops & Brands';
            case 'clusters': return 'Brand Clusters by Location';
            default: return 'Delhi Commercial Report';
        }
    };

    // Calculate summary stats
    const getSummaryStats = () => {
        if (isLocationArray(data)) {
            const avgScore = data.reduce((sum, loc) => sum + loc.total_score, 0) / data.length;
            const goodHotspots = data.filter(loc => loc.classification === 'Good Hotspot').length;
            const moderateHotspots = data.filter(loc => loc.classification === 'Moderate Hotspot').length;
            return {
                totalLocations: data.length,
                avgScore: avgScore.toFixed(1),
                goodHotspots,
                moderateHotspots,
                topLocation: data[0]?.name || 'N/A'
            };
        }
        if (isShopArray(data)) {
            const categories = new Set(data.map(s => s.brand_category).filter(Boolean));
            const avgRating = data.filter(s => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) / data.filter(s => s.rating).length;
            return {
                totalShops: data.length,
                categories: categories.size,
                avgRating: avgRating ? avgRating.toFixed(1) : 'N/A',
                brands: new Set(data.map(s => s.matched_brand).filter(Boolean)).size
            };
        }
        if (isClusterArray(data)) {
            const totalBrands = data.reduce((sum, c) => sum + c.total_brands, 0);
            const luxuryTotal = data.reduce((sum, c) => sum + c.luxury_count, 0);
            const premiumTotal = data.reduce((sum, c) => sum + c.premium_count, 0);
            return {
                totalLocations: data.length,
                totalBrands,
                luxuryBrands: luxuryTotal,
                premiumBrands: premiumTotal
            };
        }
        if (isSingleLocation(data)) {
            return {
                name: data.name,
                totalScore: data.total_score,
                classification: data.classification,
                roadsScore: data.roads_score,
                commercialScore: data.commercial_score,
                amenitiesScore: data.amenities_score
            };
        }
        return {};
    };

    const stats = getSummaryStats();

    // CSV Export
    const downloadCSV = () => {
        let csv = '';
        const timestamp = new Date().toISOString().slice(0, 10);

        if (isLocationArray(data)) {
            csv = 'ID,Name,Latitude,Longitude,Total Score,Roads Score,Commercial Score,Amenities Score,Classification,City,Zone\n';
            data.forEach(loc => {
                csv += `${loc.id},"${loc.name}",${loc.latitude},${loc.longitude},${loc.total_score},${loc.roads_score},${loc.commercial_score},${loc.amenities_score},"${loc.classification}","${loc.city || ''}","${loc.zone || ''}"\n`;
            });
        } else if (isShopArray(data)) {
            csv = 'ID,Name,Matched Brand,Category,Confidence,Rating,Latitude,Longitude\n';
            data.forEach(shop => {
                csv += `${shop.id},"${shop.name}","${shop.matched_brand || ''}","${shop.brand_category || ''}",${shop.confidence || ''},${shop.rating || ''},${shop.latitude},${shop.longitude}\n`;
            });
        } else if (isClusterArray(data)) {
            csv = 'Location,Latitude,Longitude,Total Score,Luxury Count,Intl Count,Premium Count,Total Brands,Brands\n';
            data.forEach(cluster => {
                csv += `"${cluster.location_name}",${cluster.latitude},${cluster.longitude},${cluster.total_score},${cluster.luxury_count},${cluster.intl_count},${cluster.premium_count},${cluster.total_brands},"${cluster.brands}"\n`;
            });
        } else if (isSingleLocation(data)) {
            csv = 'Field,Value\n';
            csv += `Name,"${data.name}"\n`;
            csv += `Total Score,${data.total_score}\n`;
            csv += `Classification,"${data.classification}"\n`;
            csv += `Roads Score,${data.roads_score}\n`;
            csv += `Commercial Score,${data.commercial_score}\n`;
            csv += `Amenities Score,${data.amenities_score}\n`;
            csv += `Latitude,${data.latitude}\n`;
            csv += `Longitude,${data.longitude}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `delhi_report_${queryType}_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Get category color
    const getCategoryColor = (category: string | null) => {
        if (!category) return 'text-gray-400';
        if (category.includes('luxury')) return 'text-purple-400';
        if (category.includes('premium')) return 'text-blue-400';
        if (category.includes('international')) return 'text-green-400';
        if (category.includes('indian')) return 'text-orange-400';
        return 'text-gray-400';
    };

    // Get classification color
    const getClassificationColor = (classification: string) => {
        if (classification === 'Good Hotspot') return 'text-green-400 bg-green-400/10';
        if (classification === 'Moderate Hotspot') return 'text-yellow-400 bg-yellow-400/10';
        return 'text-gray-400 bg-gray-400/10';
    };

    return (
        <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-white/10 bg-gray-900">
                <div className="flex items-center gap-3">
                    {queryType.includes('location') ? <MapPin className="text-blue-400" size={24} /> :
                        queryType.includes('shop') || queryType.includes('brand') ? <Store className="text-yellow-400" size={24} /> :
                            <Layers className="text-purple-400" size={24} />}
                    <h2 className="text-xl font-bold text-white">{getTitle()}</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                        <Download size={16} />
                        Download CSV
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

                {/* Warning Message */}
                {warningMessage && (
                    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-3 flex items-center gap-3 text-yellow-200 text-sm">
                        <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />
                        {warningMessage}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {Array.isArray(data) && data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="bg-white/5 p-6 rounded-full mb-4">
                            <AlertCircle size={48} className="text-gray-400 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Data Found</h3>
                        <p className="text-gray-400 max-w-md mb-6">
                            We couldn't find any results from the Railway database matching your query.
                            {queryType.includes('location') ? " Try checking the location name or looking for a different area." :
                                queryType.includes('brand') ? " Check the brand spelling or try searching for a category instead." :
                                    " Try broadening your search criteria."}
                        </p>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            >
                                Close Report
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                            {Object.entries(stats).map(([key, value]) => (
                                <div key={key} className="bg-white/5 p-4 rounded-lg border border-white/10">
                                    <span className="text-gray-400 text-xs uppercase tracking-wider">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <div className="text-2xl font-bold text-white mt-1">{String(value)}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-4">
                    <button
                        onClick={() => setActiveTab('data')}
                        className={`py-3 px-6 text-sm font-medium ${activeTab === 'data' ? 'text-white bg-indigo-500/20 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Data Table
                    </button>
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`py-3 px-6 text-sm font-medium ${activeTab === 'summary' ? 'text-white bg-green-500/20 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Summary
                    </button>
                </div>

                {/* Data Table */}
                {activeTab === 'data' && (
                    <div className="bg-black/30 rounded-lg border border-white/10 overflow-hidden">
                        <div className="max-h-[600px] overflow-auto">
                            {/* Locations Table */}
                            {isLocationArray(data) && (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 text-left font-medium w-12">#</th>
                                            <th className="p-3 text-left font-medium">Location</th>
                                            <th className="p-3 text-right font-medium">Total Score</th>
                                            <th className="p-3 text-right font-medium">Roads</th>
                                            <th className="p-3 text-right font-medium">Commercial</th>
                                            <th className="p-3 text-right font-medium">Amenities</th>
                                            <th className="p-3 text-left font-medium">Classification</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.map((loc, idx) => (
                                            <tr key={loc.id} className="hover:bg-white/5">
                                                <td className="p-3 text-gray-500">{idx + 1}</td>
                                                <td className="p-3 text-white font-medium">{loc.name}</td>
                                                <td className="p-3 text-right font-mono text-blue-300 font-bold">{loc.total_score.toFixed(1)}</td>
                                                <td className="p-3 text-right font-mono text-gray-400">{loc.roads_score}</td>
                                                <td className="p-3 text-right font-mono text-gray-400">{loc.commercial_score}</td>
                                                <td className="p-3 text-right font-mono text-gray-400">{loc.amenities_score}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getClassificationColor(loc.classification)}`}>
                                                        {loc.classification}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Shops Table */}
                            {isShopArray(data) && (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 text-left font-medium w-12">#</th>
                                            <th className="p-3 text-left font-medium">Shop Name</th>
                                            <th className="p-3 text-left font-medium">Brand</th>
                                            <th className="p-3 text-left font-medium">Category</th>
                                            <th className="p-3 text-right font-medium">Rating</th>
                                            <th className="p-3 text-right font-medium">Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.map((shop, idx) => (
                                            <tr key={shop.id} className="hover:bg-white/5">
                                                <td className="p-3 text-gray-500">{idx + 1}</td>
                                                <td className="p-3 text-white">{shop.name}</td>
                                                <td className="p-3 text-indigo-300 font-medium">{shop.matched_brand || '-'}</td>
                                                <td className={`p-3 text-xs uppercase ${getCategoryColor(shop.brand_category)}`}>
                                                    {shop.brand_category?.replace(/_/g, ' ') || '-'}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {shop.rating ? (
                                                        <span className={`inline-flex items-center gap-1 ${shop.rating >= 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                            {shop.rating} <Star size={12} />
                                                        </span>
                                                    ) : <span className="text-gray-600">-</span>}
                                                </td>
                                                <td className="p-3 text-right font-mono text-gray-400">{shop.confidence || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Clusters Table */}
                            {isClusterArray(data) && (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 text-left font-medium w-12">#</th>
                                            <th className="p-3 text-left font-medium">Location</th>
                                            <th className="p-3 text-right font-medium">Score</th>
                                            <th className="p-3 text-right font-medium">Luxury</th>
                                            <th className="p-3 text-right font-medium">Premium</th>
                                            <th className="p-3 text-right font-medium">Intl</th>
                                            <th className="p-3 text-right font-medium">Total</th>
                                            <th className="p-3 text-left font-medium">Top Brands</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.map((cluster, idx) => (
                                            <tr key={idx} className="hover:bg-white/5">
                                                <td className="p-3 text-gray-500">{idx + 1}</td>
                                                <td className="p-3 text-white font-medium">{cluster.location_name}</td>
                                                <td className="p-3 text-right font-mono text-blue-300">{cluster.total_score.toFixed(1)}</td>
                                                <td className="p-3 text-right font-mono text-purple-400">{cluster.luxury_count}</td>
                                                <td className="p-3 text-right font-mono text-blue-400">{cluster.premium_count}</td>
                                                <td className="p-3 text-right font-mono text-green-400">{cluster.intl_count}</td>
                                                <td className="p-3 text-right font-mono text-white font-bold">{cluster.total_brands}</td>
                                                <td className="p-3 text-gray-400 text-xs max-w-xs truncate" title={cluster.brands}>
                                                    {cluster.brands.split(', ').slice(0, 5).join(', ')}...
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Single Location Detail */}
                            {isSingleLocation(data) && (
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white/5 p-6 rounded-lg">
                                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                <MapPin size={20} className="text-blue-400" />
                                                {data.name}
                                            </h3>
                                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getClassificationColor(data.classification)}`}>
                                                {data.classification}
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-6 rounded-lg">
                                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                <TrendingUp size={20} className="text-green-400" />
                                                Total Score
                                            </h3>
                                            <div className="text-4xl font-bold text-blue-400">{data.total_score}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mt-6">
                                        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                                            <div className="text-gray-400 text-sm">Roads Score</div>
                                            <div className="text-2xl font-bold text-blue-300">{data.roads_score}</div>
                                        </div>
                                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                                            <div className="text-gray-400 text-sm">Commercial Score</div>
                                            <div className="text-2xl font-bold text-yellow-300">{data.commercial_score}</div>
                                        </div>
                                        <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                                            <div className="text-gray-400 text-sm">Amenities Score</div>
                                            <div className="text-2xl font-bold text-green-300">{data.amenities_score}</div>
                                        </div>
                                    </div>
                                    <div className="mt-6 text-gray-400 text-sm">
                                        <strong>Coordinates:</strong> {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Summary Tab */}
                {activeTab === 'summary' && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Report Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(stats).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <span className="text-white font-mono font-semibold">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 text-gray-500 text-sm">
                            Data fetched from Railway Postgres DB • No caching • Real-time data
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
