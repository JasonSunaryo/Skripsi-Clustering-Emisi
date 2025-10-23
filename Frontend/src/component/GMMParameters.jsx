import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Search, X, MapPin } from 'lucide-react';

function GMMParameters({ gmmParameters, getColor, clusterData }) {
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKabupaten, setSelectedKabupaten] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (!gmmParameters) {
    return null;
  }

  const {
    weights,
    means,
    feature_names,
    log_likelihood,
    n_iterations,
    converged,
  } = gmmParameters;

  const allKabupaten = clusterData ? Object.keys(clusterData).sort() : [];
  const filteredKabupaten = allKabupaten.filter(kab =>
    kab.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleKabupatenSelect = (kabupatenName) => {
    const kabupatenData = clusterData[kabupatenName];
    setSelectedKabupaten({
      name: kabupatenName,
      ...kabupatenData
    });
    setSearchQuery(kabupatenName);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedKabupaten(null);
    setShowSuggestions(false);
  };

  const toggleCluster = (clusterIdx) => {
    setExpandedCluster(expandedCluster === clusterIdx ? null : clusterIdx);
  };

  const formatNumber = (num) => {
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(2) + ' juta';
    } else if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(2) + ' ribu';
    }
    return num.toFixed(4);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Gaussian Mixture Model Parameters
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-4 h-4" />
          <span>Parameter model yang digunakan dalam clustering</span>
        </div>
      </div>

      {/* Kabupaten Search Section */}
      {clusterData && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Cari Kabupaten untuk Melihat Detail Clustering
          </h3>

          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Ketik nama kabupaten/kota..."
                className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {showSuggestions && searchQuery && filteredKabupaten.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredKabupaten.slice(0, 10).map((kab) => (
                  <button
                    key={kab}
                    onClick={() => handleKabupatenSelect(kab)}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{kab}</span>
                    <span className="ml-auto text-xs text-gray-500">
                      {clusterData[kab].provinsi}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedKabupaten && (
            <div className="mt-4 bg-white rounded-lg border border-blue-300 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedKabupaten.name}
                  </h4>
                  <p className="text-xs text-gray-600">{selectedKabupaten.provinsi}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600">Assigned to</div>
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold text-sm"
                    style={{ 
                      backgroundColor: getColor(selectedKabupaten.cluster) + '20',
                      color: getColor(selectedKabupaten.cluster)
                    }}
                  >
                    Cluster {selectedKabupaten.cluster + 1}
                  </div>
                </div>
              </div>

              <div className="mb-3 p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-600 mb-1">Rata-rata Emisi</div>
                <div className="text-lg font-bold text-gray-900">
                  {selectedKabupaten.avg_emission.toFixed(2)} Gg CO₂e
                </div>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">
                  Probabilitas Keanggotaan Cluster (GMM Output)
                </h5>
                <div className="space-y-2">
                  {selectedKabupaten.probabilities.map((prob, idx) => {
                    const isAssigned = idx === selectedKabupaten.cluster;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isAssigned 
                            ? 'bg-white border-current shadow-md' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                        style={isAssigned ? { borderColor: getColor(idx) } : {}}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getColor(idx) }}
                            />
                            <span className={`text-sm font-medium ${
                              isAssigned ? 'text-gray-900' : 'text-gray-600'
                            }`}>
                              Cluster {idx + 1}
                            </span>
                            {isAssigned && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                ✓ Assigned
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-bold ${
                            isAssigned ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {(prob * 100).toFixed(2)}%
                          </span>
                        </div>

                        {/* Probability Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${prob * 100}%`,
                              backgroundColor: getColor(idx)
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Convergence Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-xs text-blue-600 font-medium mb-1">Log-Likelihood</div>
          <div className="text-xl font-bold text-blue-900">{log_likelihood.toFixed(2)}</div>
          <div className="text-xs text-blue-600 mt-1">Semakin tinggi semakin baik</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-xs text-green-600 font-medium mb-1">Iterasi</div>
          <div className="text-xl font-bold text-green-900">{n_iterations}</div>
          <div className="text-xs text-green-600 mt-1">
            {converged ? '✓ Konvergen' : '⚠ Tidak Konvergen'}
          </div>
        </div>
      </div>

      {/* Cluster Parameters */}
      <div className="space-y-4">
        {weights.map((weight, clusterIdx) => {
          const isExpanded = expandedCluster === clusterIdx;
          const clusterColor = getColor(clusterIdx);

          return (
            <div
              key={clusterIdx}
              className="border rounded-lg overflow-hidden"
              style={{ borderColor: clusterColor }}
            >
              <button
                onClick={() => toggleCluster(clusterIdx)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: clusterColor }}
                  />
                  <span className="font-semibold text-gray-800">
                    Cluster {clusterIdx + 1}
                  </span>
                  <span className="px-2 py-1 bg-white border rounded text-xs font-medium text-gray-600">
                    Bobot: {(weight * 100).toFixed(2)}%
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">μ</span>
                    Mean Values (Emisi Rata-rata per Tahun)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {means[clusterIdx].map((mean, yearIdx) => (
                      <div
                        key={yearIdx}
                        className="bg-blue-50 border border-blue-200 rounded p-2"
                      >
                        <div className="text-xs font-medium text-blue-600">
                          {feature_names[yearIdx]}
                        </div>
                        <div className="text-sm font-bold text-blue-900">
                          {mean.toFixed(2)} Gg
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GMMParameters;
