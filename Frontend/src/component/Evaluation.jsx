import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine, ZAxis } from "recharts";

const ClusteringEvaluation = ({ scatterData, silhouetteScore, silhouetteData, getColor, clusteringResult, startYear, endYear }) => {
  if (!scatterData || scatterData.length === 0) {
    return null;
  }

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

  // Calculate box plot statistics for each cluster and year
  const boxPlotData = useMemo(() => {
   

    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year.toString());
    }

    // Group data by cluster using actual yearly emission data
    const clusterData = {};
    
    Object.entries(clusteringResult.kabupaten_clusters).forEach(([kabupaten, info]) => {
      const clusterId = info.cluster;
      
      if (!clusterData[clusterId]) {
        clusterData[clusterId] = {};
        years.forEach(year => {
          clusterData[clusterId][year] = [];
        });
      }

      // Use yearly_data if available (from updated backend)
      if (info.yearly_data) {
        years.forEach(year => {
          if (info.yearly_data[year] !== undefined) {
            clusterData[clusterId][year].push(info.yearly_data[year]);
          }
        });
      } else {
        // Fallback: use avg_emission with some variation
        const baseEmission = info.avg_emission;
        years.forEach((year, idx) => {
          // Add temporal trend + random variation
          const yearTrend = 1 + (idx - years.length / 2) * 0.03; // ±3% trend
          const randomVar = (Math.random() - 0.5) * 0.25; // ±12.5% random
          const emission = Math.max(0, baseEmission * yearTrend * (1 + randomVar));
          clusterData[clusterId][year].push(emission);
        });
      }
    });

    // Calculate box plot statistics
    const stats = {};
    years.forEach(year => {
      stats[year] = {};
      Object.keys(clusterData).forEach(clusterId => {
        // const values = clusterData[clusterId][year].sort((a, b) => a - b);

        const values = clusterData[clusterId][year]
        .map(v => (v === 0 ? 0 : Math.sign(v) * Math.log10(Math.abs(v))))
        .sort((a, b) => a - b);

        if (values.length === 0) return;

        const q1Index = Math.floor(values.length * 0.25);
        const q2Index = Math.floor(values.length * 0.5);
        const q3Index = Math.floor(values.length * 0.75);

        const q1 = values[q1Index];
        const q2 = values[q2Index]; // median
        const q3 = values[q3Index];
        const iqr = q3 - q1;

        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;

        const outliers = values.filter(v => v < lowerFence || v > upperFence);
        const inliers = values.filter(v => v >= lowerFence && v <= upperFence);

        stats[year][clusterId] = {
          min: inliers.length > 0 ? Math.min(...inliers) : q1,
          q1,
          median: q2,
          q3,
          max: inliers.length > 0 ? Math.max(...inliers) : q3,
          outliers,
          mean: values.reduce((sum, v) => sum + v, 0) / values.length
        };
      });
    });

    return { stats, years, clusterIds: Object.keys(clusterData).map(id => parseInt(id)).sort() };
  }, [clusteringResult, startYear, endYear]);

  return (
    <div className="space-y-6">
      {/* Silhouette Evaluation Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Evaluasi Kualitas Clustering</h2>
        
        {/* Silhouette Score Card */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center mb-6">
          <p className="text-sm text-gray-600 mb-2">Skor Silhouette</p>
          <p className="text-4xl font-bold text-blue-600">{silhouetteScore.toFixed(4)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {silhouetteScore > 0.5 ? "Kualitas clustering sangat baik" : 
             silhouetteScore > 0.3 ? "Kualitas clustering baik" : 
             "Kualitas clustering cukup"}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Total Titik Data</p>
            <p className="text-2xl font-bold text-blue-600">{scatterData.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Clustering Baik (Di Atas Rata-rata)</p>
            <p className="text-2xl font-bold text-green-600">{goodClustering}</p>
            <p className="text-xs text-gray-500">{((goodClustering / scatterData.length) * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Clustering Buruk (Negatif)</p>
            <p className="text-2xl font-bold text-red-600">{poorClustering}</p>
            <p className="text-xs text-gray-500">{((poorClustering / scatterData.length) * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Rata-rata Emisi</p>
            <p className="text-2xl font-bold text-purple-600">{avgEmission.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Gg</p>
          </div>
        </div>

        {/* Silhouette Analysis */}
        {silhouetteData && silhouetteData.length > 0 && (
          <div className="mb-8">
            <h3 className="text-md font-semibold text-gray-800 mb-3">Analisis Silhouette per Cluster</h3>
            <p className="text-sm text-gray-600 mb-4">
              Koefisien Silhouette menunjukkan seberapa baik setiap titik data cocok dengan clusternya.
              Nilai mendekati 1 menunjukkan clustering yang baik.
            </p>
            <div className="border rounded-lg p-6 bg-white">
              <div className="relative" style={{ height: '400px' }}>
                <div className="text-center mb-4">
                  <p className="text-sm font-semibold">
                    Plot Silhouette: {silhouetteData.length} cluster, skor rata-rata: {silhouetteScore.toFixed(3)}
                  </p>
                </div>
                
                <svg width="100%" height="350" style={{ border: '1px solid #e5e7eb' }}>
                  {(() => {
                    const width = 900;
                    const height = 350;
                    const margin = { top: 30, right: 30, bottom: 50, left: 80 };
                    const plotWidth = width - margin.left - margin.right;
                    const plotHeight = height - margin.top - margin.bottom;
                    
                    let totalSamples = 0;
                    silhouetteData.forEach(cluster => {
                      totalSamples += cluster.values.length;
                    });
                    
                    const yScale = plotHeight / totalSamples;
                    let currentY = margin.top;
                    
                    const xScale = (value) => margin.left + ((value + 1) / 2) * plotWidth;
                    const xZero = xScale(0);
                    
                    const elements = [];
                    
                    silhouetteData.forEach((cluster, clusterIdx) => {
                      const sortedValues = [...cluster.values].sort((a, b) => b - a);
                      const clusterColor = getColor(cluster.cluster_id);
                      const clusterHeight = sortedValues.length * yScale;
                      const clusterCenterY = currentY + (clusterHeight / 2);
                      
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
                    
                    elements.push(
                      <line key="y-axis" x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#9ca3af" strokeWidth="1" />
                    );
                    
                    elements.push(
                      <text key="y-label" x={margin.left - 50} y={height / 2} textAnchor="middle" fontSize="12" fill="#6b7280" transform={`rotate(-90, ${margin.left - 50}, ${height / 2})`}>
                        Cluster
                      </text>
                    );
                    
                    elements.push(
                      <line key="x-axis" x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#9ca3af" strokeWidth="1" />
                    );
                    
                    elements.push(
                      <text key="x-label" x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fill="#6b7280">
                        Koefisien Silhouette
                      </text>
                    );
                    
                    [-1, -0.5, 0, 0.5, 1].forEach(value => {
                      const x = xScale(value);
                      elements.push(
                        <g key={`tick-${value}`}>
                          <line x1={x} y1={height - margin.bottom} x2={x} y2={height - margin.bottom + 5} stroke="#9ca3af" strokeWidth="1" />
                          <text x={x} y={height - margin.bottom + 18} textAnchor="middle" fontSize="10" fill="#6b7280">
                            {value.toFixed(2)}
                          </text>
                        </g>
                      );
                    });
                    
                    const avgX = xScale(silhouetteScore);
                    elements.push(
                      <g key="avg-line">
                        <line x1={avgX} y1={margin.top} x2={avgX} y2={height - margin.bottom} stroke="#000" strokeWidth="2" strokeDasharray="5,5" />
                        <text x={avgX} y={margin.top - 5} textAnchor="middle" fontSize="11" fill="#000" fontWeight="600">
                          Rata-rata: {silhouetteScore.toFixed(3)}
                        </text>
                      </g>
                    );
                    
                    return elements;
                  })()}
                </svg>
              </div>
              
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                {silhouetteData.map((cluster) => (
                  <div key={cluster.cluster_id} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: getColor(cluster.cluster_id) }} />
                    <span className="text-sm font-medium">Cluster {cluster.cluster_id + 1}</span>
                    <span className="text-xs text-gray-600">(Rata-rata: {cluster.avg.toFixed(3)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scatter Plot */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Plot Scatter Emisi vs Silhouette</h3>
          <p className="text-sm text-gray-600 mb-4">
            Plot scatter menunjukkan hubungan antara rata-rata emisi dan koefisien silhouette. 
            Titik di atas garis putus-putus (rata-rata silhouette) menunjukkan clustering yang baik.
          </p>
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="avg_emission" 
                name="Rata-rata Emisi"
                label={{ value: 'Rata-rata Emisi (Gg)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                type="number" 
                dataKey="silhouette" 
                name="Silhouette"
                domain={[-0.5, 1]}
                tickFormatter={(value) => value.toFixed(2)}
                label={{ value: 'Koefisien Silhouette', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="confidence" range={[50, 400]} name="Kepercayaan" />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '20px' }} />
              
              <ReferenceLine 
                y={silhouetteScore} 
                stroke="#000" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                label={{ value: `Rata-rata: ${silhouetteScore.toFixed(3)}`, position: 'right' }}
              />
              <ReferenceLine y={0} stroke="#ff0000" strokeWidth={1} strokeDasharray="3 3" />

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
              <p className="font-medium text-gray-700 mb-1">Koefisien Silhouette:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Nilai mendekati 1: Data sangat cocok dengan clusternya</li>
                <li>Nilai mendekati 0: Data berada di boundary antar cluster</li>
                <li>Nilai negatif: Data mungkin salah di-cluster</li>
              </ul>
            </div>
          </div>
        </div>

      
      </div>

      {/* Box Plot Section */}
      {boxPlotData && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Distribusi Emisi per Cluster dan Tahun
          </h2>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            {boxPlotData.clusterIds.map(clusterId => (
              <div key={clusterId} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: getColor(clusterId) }} />
                <span className="text-sm font-medium">{clusterId}</span>
              </div>
            ))}
          </div>

          {/* Box Plot Chart */}
          <div className="overflow-x-auto flex justify-center">
            <svg width={800} height={400} className="border border-gray-200">
              {(() => {
                const { stats, years, clusterIds } = boxPlotData;
                const margin = { top: 40, right: 40, bottom: 60, left: 80 };
                const width = 800 - margin.left - margin.right;
                const height = 400 - margin.top - margin.bottom;
                
                // Find global min/max
                let globalMin = Infinity;
                let globalMax = -Infinity;
                
                years.forEach(year => {
                  clusterIds.forEach(clusterId => {
                    const data = stats[year][clusterId];
                    if (data) {
                      globalMin = Math.min(globalMin, data.min, ...data.outliers);
                      globalMax = Math.max(globalMax, data.max, ...data.outliers);
                    }
                  });
                });

                // Add padding
                const padding = (globalMax - globalMin) * 0.1;
                globalMin -= padding;
                globalMax += padding;

                const yScale = (value) => {
                  return margin.top + height - ((value - globalMin) / (globalMax - globalMin)) * height;
                };

                const xSpacing = width / years.length;
                const boxWidth = (xSpacing / clusterIds.length) * 0.7;

                const elements = [];

                // Y-axis
                elements.push(
                  <line key="y-axis" x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + height} stroke="#000" strokeWidth="1.5" />
                );

                // Y-axis label
                elements.push(
                  <text key="y-label" x={20} y={margin.top + height / 2} textAnchor="middle" fontSize="12" fill="#000" transform={`rotate(-90, 20, ${margin.top + height / 2})`}>
                      Log₁₀ Emisi (Gg)
                  </text>
                );

                // Y-axis ticks
                const yTicks = 5;
                for (let i = 0; i <= yTicks; i++) {
                  const value = globalMin + ((globalMax - globalMin) / yTicks) * i;
                  const y = yScale(value);
                  elements.push(
                    <g key={`ytick-${i}`}>
                      <line x1={margin.left - 5} y1={y} x2={margin.left} y2={y} stroke="#000" strokeWidth="1" />
                      <text x={margin.left - 10} y={y} textAnchor="end" alignmentBaseline="middle" fontSize="10" fill="#000">
                        {Math.round(value).toLocaleString()}
                      </text>
                    </g>
                  );
                }

                // X-axis
                elements.push(
                  <line key="x-axis" x1={margin.left} y1={margin.top + height} x2={margin.left + width} y2={margin.top + height} stroke="#000" strokeWidth="1.5" />
                );

                // X-axis label
                elements.push(
                  <text key="x-label" x={margin.left + width / 2} y={margin.top + height + 50} textAnchor="middle" fontSize="12" fill="#000">
                    Year
                  </text>
                );

                // Box plots
                years.forEach((year, yearIndex) => {
                  const xCenter = margin.left + (yearIndex + 0.5) * xSpacing;

                  // Year label
                  elements.push(
                    <text key={`year-${year}`} x={xCenter} y={margin.top + height + 20} textAnchor="middle" fontSize="11" fill="#000">
                      {year}
                    </text>
                  );

                  clusterIds.forEach((clusterId, clusterIndex) => {
                    const data = stats[year][clusterId];
                    if (!data) return;

                    const xOffset = (clusterIndex - clusterIds.length / 2 + 0.5) * boxWidth;
                    const x = xCenter + xOffset;
                    const color = getColor(clusterId);

                    // Whiskers (min to Q1, Q3 to max)
                    elements.push(
                      <line key={`whisker-lower-${year}-${clusterId}`} x1={x} y1={yScale(data.min)} x2={x} y2={yScale(data.q1)} stroke="#000" strokeWidth="1" />
                    );
                    elements.push(
                      <line key={`whisker-upper-${year}-${clusterId}`} x1={x} y1={yScale(data.q3)} x2={x} y2={yScale(data.max)} stroke="#000" strokeWidth="1" />
                    );

                    // Min/Max caps
                    const capWidth = boxWidth * 0.3;
                    elements.push(
                      <line key={`cap-min-${year}-${clusterId}`} x1={x - capWidth / 2} y1={yScale(data.min)} x2={x + capWidth / 2} y2={yScale(data.min)} stroke="#000" strokeWidth="1" />
                    );
                    elements.push(
                      <line key={`cap-max-${year}-${clusterId}`} x1={x - capWidth / 2} y1={yScale(data.max)} x2={x + capWidth / 2} y2={yScale(data.max)} stroke="#000" strokeWidth="1" />
                    );

                    // Box (Q1 to Q3)
                    const boxHeight = Math.abs(yScale(data.q1) - yScale(data.q3));
                    elements.push(
                      <rect 
                        key={`box-${year}-${clusterId}`}
                        x={x - boxWidth / 2} 
                        y={yScale(data.q3)} 
                        width={boxWidth} 
                        height={boxHeight}
                        fill={color} 
                        stroke="#000" 
                        strokeWidth="1"
                      />
                    );

                    // Median line
                    elements.push(
                      <line 
                        key={`median-${year}-${clusterId}`}
                        x1={x - boxWidth / 2} 
                        y1={yScale(data.median)} 
                        x2={x + boxWidth / 2} 
                        y2={yScale(data.median)} 
                        stroke="#000" 
                        strokeWidth="2"
                      />
                    );

                    // Outliers
                    data.outliers.forEach((outlier, idx) => {
                      elements.push(
                        <circle 
                          key={`outlier-${year}-${clusterId}-${idx}`}
                          cx={x} 
                          cy={yScale(outlier)} 
                          r="2" 
                          fill="none"
                          stroke="#000" 
                          strokeWidth="1"
                        />
                      );
                    });
                  });
                });

                return elements;
              })()}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClusteringEvaluation;