import { useState } from 'react';
import { Search, X, MapPin } from 'lucide-react';

function Probability({ gmmParameters, getColor, clusterData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKabupaten, setSelectedKabupaten] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (!gmmParameters) {
    return null;
  }

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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        Soft Clustering - Probabilitas Keanggotaan GMM
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Setiap kabupaten memiliki probabilitas keanggotaan ke semua cluster. Kabupaten ditempatkan di cluster dengan probabilitas tertinggi.
      </p>

      {/* Kabupaten Search Section */}
      {clusterData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Cari Kabupaten untuk Melihat Soft Clustering
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
                  <div className="text-xs text-gray-600">Ditempatkan di</div>
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
                                ✓ Terpilih
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
    </div>
  );
}

export default Probability;