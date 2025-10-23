import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ClusteringEvaluation from "./Evaluation.jsx";
import ClusterDataTable from "./ClusterDataTable";
import GMMParameters from "./GMMParameters.jsx";
import "leaflet/dist/leaflet.css";

const API_URL = "http://localhost:8000";

function Home() {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clusterData, setClusterData] = useState({});
  const [clusterStats, setClusterStats] = useState([]);
  const [startYear, setStartYear] = useState("2015");
  const [endYear, setEndYear] = useState("2020");
  const [sector, setSector] = useState("kehutanan");
  const [nClusters, setNClusters] = useState(3);
  const [removeOutliers, setRemoveOutliers] = useState(true);
  const [percentileThreshold, setPercentileThreshold] = useState(95);
  const [showTable, setShowTable] = useState(false);
  const [isClustering, setIsClustering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [outliersData, setOutliersData] = useState([]);
  const [silhouetteScore, setSilhouetteScore] = useState(null);
  const [silhouetteData, setSilhouetteData] = useState([]);
  const [scatterData, setScatterData] = useState([]);
  const [showOutliersList, setShowOutliersList] = useState(false);
  const [gmmParameters, setGmmParameters] = useState(null);

  const sectorOptions = [
    { value: "all", label: "Semua Sektor" },
    { value: "energi", label: "Energi" },
    { value: "kehutanan", label: "Kehutanan" },
    { value: "limbah", label: "Limbah" },
    { value: "ippu", label: "IPPU" },
    { value: "pertanian", label: "Pertanian" },
  ];

  useEffect(() => {
    fetch("/geojson/peta_indonesia_update3.geojson")
      .then((res) => res.json())
      .then((data) => {
        setGeoData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading GeoJSON:", err);
        setLoading(false);
      });
  }, []);

  const handleClustering = async () => {
    if (!startYear || !endYear || !sector) {
      setErrorMessage("Mohon lengkapi semua field");
      return;
    }

    setIsClustering(true);
    setErrorMessage("");
    setShowOutliersList(false);

    try {
      const response = await fetch(`${API_URL}/api/clustering`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_year: parseInt(startYear),
          end_year: parseInt(endYear),
          sector: sector,
          n_clusters: nClusters,
          remove_outliers: removeOutliers,
          percentile_threshold: percentileThreshold,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Clustering gagal");
      }

      const result = await response.json();

      if (result.success) {
        setClusterData(result.data.kabupaten_clusters);
        setClusterStats(result.data.cluster_stats);
        setOutliersData(result.data.outliers || []);
        setSilhouetteScore(result.data.silhouette_score);
        setSilhouetteData(result.data.silhouette_data || []);
        setScatterData(result.data.scatter_data || []);
        setGmmParameters(result.data.gmm_parameters || null);
        setShowTable(true);
      }
    } catch (error) {
      console.error("Error running clustering:", error);
      setErrorMessage(error.message);
    } finally {
      setIsClustering(false);
    }
  };

  const getColor = (clusterId) => {
    if (!clusterStats || clusterStats.length === 0) {
      const colors = [
        "#FF4444",
        "#44FF44",
        "#4444FF",
        "#FFAA00",
        "#AA00FF",
        "#FF44AA",
      ];
      return colors[clusterId] || "#DDDDDD";
    }

    const sortedClusters = [...clusterStats].sort(
      (a, b) => a.avg_emission - b.avg_emission
    );
    const position = sortedClusters.findIndex(
      (stat) => stat.cluster_id === clusterId
    );

    if (position === -1) return "#DDDDDD";

    const numClusters = sortedClusters.length;
    const ratio = position / (numClusters - 1 || 1);

    let r, g, b;

    if (ratio < 0.33) {
      const localRatio = ratio / 0.33;
      r = Math.round(144 + (255 - 144) * localRatio);
      g = Math.round(238 - (238 - 237) * localRatio);
      b = Math.round(144 - 144 * localRatio);
    } else if (ratio < 0.67) {
      const localRatio = (ratio - 0.33) / 0.34;
      r = 255;
      g = Math.round(237 - (237 - 165) * localRatio);
      b = 0;
    } else {
      const localRatio = (ratio - 0.67) / 0.33;
      r = 255;
      g = Math.round(165 - 165 * localRatio);
      b = 0;
    }

    return `rgb(${r}, ${g}, ${b})`;
  };

  const matchKabupatenName = (shapeName) => {
    if (clusterData[shapeName]) {
      return clusterData[shapeName];
    }

    const cleanName = shapeName
      .replace("KAB. ", "")
      .replace("KOTA ", "")
      .trim();

    for (const [key, value] of Object.entries(clusterData)) {
      const cleanKey = key.replace("KAB. ", "").replace("KOTA ", "").trim();
      if (cleanKey === cleanName || key === shapeName) {
        return value;
      }
    }

    return null;
  };

  const formatSourceName = (source) => {
    return source
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const createPopupContent = (shapeName, provinsi, clusterInfo) => {
    let popupHTML = `
      <div style="min-width: 220px; max-width: 400px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; margin: -10px -10px 10px -10px; border-radius: 4px 4px 0 0;">
          <strong style="font-size: 16px; display: block; margin-bottom: 4px;">${shapeName}</strong>
          <div style="font-size: 12px; opacity: 0.95;">
            <span style="opacity: 0.8;">📍</span> ${provinsi}
          </div>
        </div>
    `;

    if (clusterInfo) {
      const clusterColor = getColor(clusterInfo.cluster);

      popupHTML += `
        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <strong style="font-size: 14px; color: #333;">Info Cluster</strong>
            <div style="background: ${clusterColor}; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 12px;">
              Cluster ${clusterInfo.cluster + 1}
            </div>
          </div>
          <div style="font-size: 13px; color: #555; line-height: 1.8;">
            <div style="display: flex; justify-content: space-between;">
              <span>💨 Rata-rata Emisi:</span>
              <strong style="color: #333;">${clusterInfo.avg_emission.toFixed(
                2
              )} Gg</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>🎯 Probabilitas:</span>
              <strong style="color: #333;">${(
                clusterInfo.probabilities[clusterInfo.cluster] * 100
              ).toFixed(1)}%</strong>
            </div>
          </div>
        </div>
      `;

      if (
        clusterInfo.sources &&
        Object.keys(clusterInfo.sources).length !== 0
      ) {
        const sources = clusterInfo.sources;
        const sortedSources = Object.entries(sources).sort(
          (a, b) => b[1] - a[1]
        );

        popupHTML += `
          <div style="margin-top: 10px;">
            <div style="background: #e3f2fd; padding: 8px 10px; border-radius: 4px 4px 0 0; border-left: 4px solid #2196f3;">
              <strong style="font-size: 13px; color: #1565c0;">🏭 Sumber Emisi (${sector.toUpperCase()})</strong>
            </div>
            <div style="background: white; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 4px 4px; max-height: 200px; overflow-y: auto;">
        `;

        sortedSources.forEach(([source, value], index) => {
          const percentage = ((value / clusterInfo.avg_emission) * 100).toFixed(
            1
          );
          const barWidth = Math.min(percentage, 100);

          popupHTML += `
            <div style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0; ${
              index === sortedSources.length - 1 ? "border-bottom: none;" : ""
            }">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 11px; color: #555; font-weight: 500; flex: 1;">${formatSourceName(
                  source
                )}</span>
                <span style="font-size: 11px; font-weight: bold; color: #333; margin-left: 8px;">${value.toFixed(
                  2
                )} Gg</span>
              </div>
              <div style="background: #f0f0f0; height: 4px; border-radius: 2px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #4caf50, #8bc34a); height: 100%; width: ${barWidth}%; border-radius: 2px; transition: width 0.3s;"></div>
              </div>
            </div>
          `;
        });

        popupHTML += `</div></div>`;
      } else if (sector !== "all") {
        popupHTML += `
          <div style="margin-top: 10px; padding: 10px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
            <div style="font-size: 12px; color: #e65100;">
              ℹ️ Data sumber emisi tidak tersedia untuk wilayah ini
            </div>
          </div>
        `;
      }
    } else {
      popupHTML += `
        <div style="padding: 10px; background: #ffebee; border-left: 4px solid #f44336; border-radius: 4px;">
          <div style="font-size: 13px; color: #c62828; font-weight: 500;">
            Wilayah belum tercluster / outlier yang dibuang 
          </div>
          <div style="font-size: 11px; color: #d32f2f; margin-top: 4px;">
            Jalankan clustering untuk melihat data
          </div>
        </div>
      `;
    }

    popupHTML += `</div>`;
    return popupHTML;
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        <h2 className="text-xl font-semibold">Memuat Peta Indonesia...</h2>
        <p className="text-gray-500">
          Mohon tunggu sementara data geografis dimuat
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Clustering Parameters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Parameter Clustering
            </h2>

            {errorMessage && (
              <div className="mt-4 p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tahun Awal
                </label>
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 25 }, (_, i) => 2000 + i).map(
                    (year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tahun Akhir
                </label>
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 25 }, (_, i) => 2000 + i).map(
                    (year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sektor
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sectorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Cluster
                </label>
                <input
                  type="number"
                  value={nClusters}
                  onChange={(e) => setNClusters(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleClustering}
                  disabled={isClustering}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isClustering ? "Memproses..." : "Jalankan Clustering"}
                </button>
              </div>
            </div>

            {/* Outlier Settings */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Pengaturan Outlier
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="removeOutliers"
                    checked={removeOutliers}
                    onChange={(e) => setRemoveOutliers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="removeOutliers"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Hapus Outlier
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ambang Persentil
                  </label>
                  <input
                    type="number"
                    min="90"
                    max="100"
                    value={percentileThreshold}
                    onChange={(e) =>
                      setPercentileThreshold(parseInt(e.target.value))
                    }
                    disabled={!removeOutliers}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center text-xs text-gray-500">
                  <div>
                    <p className="font-medium">Info:</p>
                    <p>
                      Data dengan nilai di atas persentil {percentileThreshold}%
                      akan dihapus. Turunkan percentile jika ada emisi dengan
                      nilai tidak wajar agar cluster terbentuk lebih baik.
                    </p>
                  </div>
                </div>
              </div>

              {/* Outliers List */}
              {showTable && removeOutliers && outliersData.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <button
                    onClick={() => setShowOutliersList(!showOutliersList)}
                    className="flex items-center justify-between w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        Outlier yang Dihapus
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                        {outliersData.length}
                      </span>
                    </div>
                    {showOutliersList ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  {showOutliersList && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-3">
                        Kabupaten berikut dihapus karena nilai emisi rata-rata
                        melebihi persentil {percentileThreshold}%
                      </p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                No
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Kabupaten
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Provinsi
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Rata-rata Emisi (Gg)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {outliersData.map((outlier, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                  {outlier.kabupaten}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                  {outlier.provinsi}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-right text-red-600 font-semibold">
                                  {outlier.avg_emission.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cluster Statistics */}
          {showTable && clusterStats.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Statistik Cluster
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600">Tingkat Emisi:</span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-16 h-4 rounded"
                      style={{
                        background:
                          "linear-gradient(to right, #90EE90, #FFED00, #FFA500, #FF0000)",
                      }}
                    />
                    <span className="text-gray-500">Rendah → Tinggi</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...clusterStats]
                  .sort((a, b) => a.avg_emission - b.avg_emission)
                  .map((stat) => (
                    <div
                      key={stat.cluster_id}
                      className="p-4 border rounded-lg"
                      style={{
                        borderColor: getColor(stat.cluster_id),
                        borderWidth: "2px",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">
                          Cluster {stat.cluster_id + 1}
                        </h3>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getColor(stat.cluster_id) }}
                        />
                      </div>
                      <p className="text-sm text-gray-600">
                        Wilayah: {stat.count}
                      </p>
                      <p className="text-sm text-gray-600">
                        Persentase: {stat.percentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">
                        Rata-rata Keyakinan: {(stat.avg_confidence * 100).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        Rata-rata Emisi: {stat.avg_emission.toFixed(2)} Gg
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Clustering Map */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Peta Clustering
              </h2>
              {sector !== "all" && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Klik wilayah pada peta untuk melihat detail sumber emisi
                  sektor {sector.toUpperCase()}
                </p>
              )}
            </div>
            <div className="h-[500px] w-full">
              <MapContainer
                center={[-0.5, 117]}
                zoom={4.5}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {geoData && (
                  <GeoJSON
                    key={JSON.stringify(clusterData)}
                    data={geoData}
                    style={(feature) => {
                      const shapeName = feature.properties.shapeName;
                      const clusterInfo = matchKabupatenName(shapeName);
                      const clusterId = clusterInfo?.cluster;

                      return {
                        color: "#000000",
                        weight: 1,
                        fillColor:
                          clusterId !== undefined
                            ? getColor(clusterId)
                            : "#DDDDDD",
                        fillOpacity: 0.7,
                      };
                    }}
                    onEachFeature={(feature, layer) => {
                      const shapeName =
                        feature.properties.shapeName || "Unknown";
                      const provinsi = feature.properties.Provinsi || "Unknown";
                      const clusterInfo = matchKabupatenName(shapeName);

                      const popupContent = createPopupContent(
                        shapeName,
                        provinsi,
                        clusterInfo
                      );
                      layer.bindPopup(popupContent, {
                        maxWidth: 400,
                        className: "custom-popup",
                      });
                    }}
                  />
                )}
              </MapContainer>
            </div>
          </div>

          {/* Cluster Data Table */}
          {showTable && Object.keys(clusterData).length > 0 && (
            <ClusterDataTable
              clusterData={clusterData}
              clusterStats={clusterStats}
              getColor={getColor}
            />
          )}

          {/* GMM Parameters */}
          {showTable && gmmParameters && (
            <GMMParameters
              gmmParameters={gmmParameters}
              getColor={getColor}
              clusterData={clusterData}
            />
          )}

          {/* Clustering Evaluation */}
          {showTable && scatterData.length > 0 && (
            <ClusteringEvaluation
              scatterData={scatterData}
              silhouetteScore={silhouetteScore}
              silhouetteData={silhouetteData}
              getColor={getColor}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;