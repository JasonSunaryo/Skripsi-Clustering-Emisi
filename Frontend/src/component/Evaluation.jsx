import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ZAxis, BarChart, Bar } from "recharts";

const ClusteringEvaluation = ({ scatterData, silhouetteScore, silhouetteData, getColor }) => {
  if (!scatterData || scatterData.length === 0) {
    return null;
  }

  // Custom tooltip for scatter plot
  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold mb-2">{data.kabupaten}</p>
          <p className="text-xs text-gray-600">Provinsi: {data.provinsi}</p>
          <p className="text-xs">Cluster: {data.cluster + 1}</p>
          <p className="text-xs">Avg Emission: {data.avg_emission.toFixed(2)} Gg</p>
          <p className="text-xs">Silhouette: {data.silhouette.toFixed(3)}</p>
          <p className="text-xs">Confidence: {(data.confidence * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // Group data by cluster for separate scatter series
  const clusterGroups = {};
  scatterData.forEach(point => {
    if (!clusterGroups[point.cluster]) {
      clusterGroups[point.cluster] = [];
    }
    clusterGroups[point.cluster].push(point);
  });

  // Calculate statistics
  const avgEmission = scatterData.reduce((sum, d) => sum + d.avg_emission, 0) / scatterData.length;
  const goodClustering = scatterData.filter(d => d.silhouette > silhouetteScore).length;
  const poorClustering = scatterData.filter(d => d.silhouette < 0).length;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Clustering Quality Evaluation</h2>
      
      {/* Silhouette Score Card */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center mb-6">
        <p className="text-sm text-gray-600 mb-2">Silhouette Score</p>
        <p className="text-4xl font-bold text-blue-600">{silhouetteScore.toFixed(4)}</p>
        <p className="text-xs text-gray-500 mt-2">
          {silhouetteScore > 0.5 ? "Excellent clustering quality" : 
           silhouetteScore > 0.3 ? "Good clustering quality" : 
           "Fair clustering quality"}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">Total Data Points</p>
          <p className="text-2xl font-bold text-blue-600">{scatterData.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">Good Clustering (Above Avg)</p>
          <p className="text-2xl font-bold text-green-600">{goodClustering}</p>
          <p className="text-xs text-gray-500">{((goodClustering / scatterData.length) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">Poor Clustering (Negative)</p>
          <p className="text-2xl font-bold text-red-600">{poorClustering}</p>
          <p className="text-xs text-gray-500">{((poorClustering / scatterData.length) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">Avg Emission</p>
          <p className="text-2xl font-bold text-purple-600">{avgEmission.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Gg</p>
        </div>
      </div>

     {/* Silhouette Analysis */}
     {silhouetteData && silhouetteData.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Silhouette Analysis per Cluster</h3>
          <p className="text-sm text-gray-600 mb-4">
            Silhouette coefficient menunjukkan seberapa baik setiap data point cocok dengan clusternya.
            Nilai mendekati 1 menunjukkan clustering yang baik.
          </p>
          <div className="border rounded-lg p-6 bg-white">
            <div className="relative" style={{ height: '400px' }}>
              {/* Title */}
              <div className="text-center mb-4">
                <p className="text-sm font-semibold">
                  Silhouette plot: {silhouetteData.length} clusters, avg score: {silhouetteScore.toFixed(3)}
                </p>
              </div>
              
              {/* Canvas for silhouette plot */}
              <svg width="100%" height="350" style={{ border: '1px solid #e5e7eb' }}>
                {(() => {
                  const width = 900;
                  const height = 350;
                  const margin = { top: 30, right: 30, bottom: 50, left: 80 };
                  const plotWidth = width - margin.left - margin.right;
                  const plotHeight = height - margin.top - margin.bottom;
                  
                  // Calculate total samples and positions
                  let totalSamples = 0;
                  silhouetteData.forEach(cluster => {
                    totalSamples += cluster.values.length;
                  });
                  
                  const yScale = plotHeight / totalSamples;
                  let currentY = margin.top;
                  
                  // X scale: -1 to 1 for silhouette values
                  const xScale = (value) => margin.left + ((value + 1) / 2) * plotWidth;
                  const xZero = xScale(0);
                  
                  const elements = [];
                  
                  // Draw each cluster
                  silhouetteData.forEach((cluster, clusterIdx) => {
                    const sortedValues = [...cluster.values].sort((a, b) => b - a);
                    const clusterColor = getColor(cluster.cluster_id);
                    const clusterHeight = sortedValues.length * yScale;
                    const clusterCenterY = currentY + (clusterHeight / 2);
                    
                    // Draw bars for each sample in cluster
                    sortedValues.forEach((value, idx) => {
                      const y = currentY + (idx * yScale);
                      const x = value >= 0 ? xZero : xScale(value);
                      const barWidth = Math.abs(xScale(value) - xZero);
                      
                      elements.push(
                        <rect
                          key={`bar-${clusterIdx}-${idx}`}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={yScale}
                          fill={clusterColor}
                          opacity={0.8}
                          stroke="none"
                        />
                      );
                    });
                    
                    // Add cluster label
                    elements.push(
                      <text
                        key={`label-${clusterIdx}`}
                        x={margin.left - 10}
                        y={clusterCenterY}
                        textAnchor="end"
                        alignmentBaseline="middle"
                        fontSize="12"
                        fill="#374151"
                        fontWeight="500"
                      >
                        {cluster.cluster_id + 1}
                      </text>
                    );
                    
                    currentY += clusterHeight;
                  });
                  
                  // Draw axes
                  // Y-axis
                  elements.push(
                    <line
                      key="y-axis"
                      x1={margin.left}
                      y1={margin.top}
                      x2={margin.left}
                      y2={height - margin.bottom}
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />
                  );
                  
                  // Y-axis label
                  elements.push(
                    <text
                      key="y-label"
                      x={margin.left - 50}
                      y={height / 2}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#6b7280"
                      transform={`rotate(-90, ${margin.left - 50}, ${height / 2})`}
                    >
                      Cluster
                    </text>
                  );
                  
                  // X-axis
                  elements.push(
                    <line
                      key="x-axis"
                      x1={margin.left}
                      y1={height - margin.bottom}
                      x2={width - margin.right}
                      y2={height - margin.bottom}
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />
                  );
                  
                  // X-axis label
                  elements.push(
                    <text
                      key="x-label"
                      x={width / 2}
                      y={height - 10}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#6b7280"
                    >
                      Silhouette Coefficient
                    </text>
                  );
                  
                  // X-axis ticks
                  [-1, -0.5, 0, 0.5, 1].forEach(value => {
                    const x = xScale(value);
                    elements.push(
                      <g key={`tick-${value}`}>
                        <line
                          x1={x}
                          y1={height - margin.bottom}
                          x2={x}
                          y2={height - margin.bottom + 5}
                          stroke="#9ca3af"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={height - margin.bottom + 18}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#6b7280"
                        >
                          {value.toFixed(2)}
                        </text>
                      </g>
                    );
                  });
                  
                  // Average silhouette line
                  const avgX = xScale(silhouetteScore);
                  elements.push(
                    <g key="avg-line">
                      <line
                        x1={avgX}
                        y1={margin.top}
                        x2={avgX}
                        y2={height - margin.bottom}
                        stroke="#000"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                      <text
                        x={avgX}
                        y={margin.top - 5}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#000"
                        fontWeight="600"
                      >
                        Avg: {silhouetteScore.toFixed(3)}
                      </text>
                    </g>
                  );
                  
                  return elements;
                })()}
              </svg>
            </div>
            
            {/* Cluster Legend */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
              {silhouetteData.map((cluster) => (
                <div key={cluster.cluster_id} className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getColor(cluster.cluster_id) }}
                  />
                  <span className="text-sm font-medium">
                    Cluster {cluster.cluster_id + 1}
                  </span>
                  <span className="text-xs text-gray-600">
                    (Avg: {cluster.avg.toFixed(3)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scatter Plot */}
      <div className="mb-6">
        <h3 className="text-md font-semibold text-gray-800 mb-3">Emission vs Silhouette Scatter Plot</h3>
        <p className="text-sm text-gray-600 mb-4">
          Scatter plot menunjukkan hubungan antara rata-rata emisi dan silhouette coefficient. 
          Titik di atas garis putus-putus (rata-rata silhouette) menunjukkan clustering yang baik.
        </p>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="avg_emission" 
              name="Avg Emission"
              label={{ value: 'Average Emission (Gg)', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              type="number" 
              dataKey="silhouette" 
              name="Silhouette"
              domain={[-0.5, 1]}
              tickFormatter={(value) => value.toFixed(2)}
              label={{ value: 'Silhouette Coefficient', angle: -90, position: 'insideLeft' }}
            />
            <ZAxis type="number" dataKey="confidence" range={[50, 400]} name="Confidence" />
            <Tooltip content={<CustomScatterTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ paddingBottom: '20px' }}
            />
            
            {/* Reference lines */}
            <ReferenceLine 
              y={silhouetteScore} 
              stroke="#000" 
              strokeWidth={2} 
              strokeDasharray="5 5"
              label={{ value: `Avg: ${silhouetteScore.toFixed(3)}`, position: 'right' }}
            />
            <ReferenceLine 
              y={0} 
              stroke="#ff0000" 
              strokeWidth={1} 
              strokeDasharray="3 3"
            />

            {/* Scatter series for each cluster */}
            {Object.entries(clusterGroups).map(([clusterId, data]) => (
              <Scatter
                key={clusterId}
                name={`Cluster ${parseInt(clusterId) + 1}`}
                data={data}
                fill={getColor(parseInt(clusterId))}
                fillOpacity={0.6}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Interpretation Guide */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Interpretasi:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 mb-1">Silhouette Coefficient:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Nilai mendekati 1: Data sangat cocok dengan clusternya</li>
              <li>Nilai mendekati 0: Data berada di boundary antar cluster</li>
              <li>Nilai negatif: Data mungkin salah di-cluster</li>
            </ul>
          </div>
          
        </div>
      </div>

      {/* Detailed Statistics Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Cluster-wise Statistics:</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cluster</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Silhouette</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Emission</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Confidence</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(clusterGroups).map(([clusterId, data]) => {
                const avgSilhouette = data.reduce((sum, d) => sum + d.silhouette, 0) / data.length;
                const avgEmission = data.reduce((sum, d) => sum + d.avg_emission, 0) / data.length;
                const avgConfidence = data.reduce((sum, d) => sum + d.confidence, 0) / data.length;

                
                return (
                  <tr key={clusterId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: getColor(parseInt(clusterId)) }}
                        />
                        <span className="text-sm font-medium">Cluster {parseInt(clusterId) + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{data.length}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {avgSilhouette.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {avgEmission.toFixed(2)} Gg
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {(avgConfidence * 100).toFixed(1)}%
                    </td>
                 
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClusteringEvaluation;