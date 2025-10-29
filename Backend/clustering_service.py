# Import library yang digunakan
import pandas as pd
import numpy as np
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler, PowerTransformer
from sklearn.metrics import silhouette_score, silhouette_samples
import os
from scipy import stats  # Untuk Z-score


# Definisi kelas utama untuk proses clustering
class ClusteringService:
    def __init__(self):
        # Menentukan direktori dasar dari file saat ini
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        # Menentukan folder tempat file Excel disimpan
        self.EXCEL_DIR = os.path.join(self.BASE_DIR, 'Excel')
        # Menentukan path file Excel mentah (belum diolah)
        self.RAW_EXCEL_FILE = os.path.join(self.EXCEL_DIR, 'data_emisi_klhk_mentah.xlsx')
        # Menentukan path file Excel hasil penggabungan data
        self.EXCEL_FILE = os.path.join(self.EXCEL_DIR, 'data_emisi_gabungan.xlsx')


        # Threshold Z-score untuk deteksi outlier (default: 3)
        self.ZSCORE_THRESHOLD = 3

        # Pemetaan antara nama sektor dengan nama sheet di Excel
        self.SHEET_MAPPING = {
            'energi': 'Energi',
            'kehutanan': 'Kehutanan',
            'limbah': 'Limbah',
            'pertanian': 'Pertanian',
            'ippu': 'Ippu'
        }

        # Daftar pola sumber emisi berdasarkan sektor
        self.SOURCE_PATTERNS = {
            'energi': [
                'INDUSTRI BATU BARA', 'INDUSTRI ENERGI',
                'MANUFAKTUR & KONSTRUKSI', 'MINYAK & GAS BUMI',
                'PERKANTORAN & PEMUKIMAN', 'TRANSPORTASI'
            ],
            'kehutanan': ['BIOMASS', 'PEAT DECOMPOSITION', 'PEAT FIRE'],
            'limbah': [
                'LIMBAH CAIR DOMESTIK', 'LIMBAH CAIR INDUSTRI',
                'LIMBAH PADAT', 'PEMBAKARAN', 'PENGOLAHAN SECARA BIOLOGIS'
            ],
            'pertanian': [
                'Biomass Burning', 'Liming', 'Livestock',
                'N2O from Managed Soils', 'Rice Cultivation', 'Urea'
            ],
            'ippu': [
                'INDUSTRI KIMIA', 'INDUSTRI LOGAM',
                'INDUSTRI MINERAL', 'INDUSTRI NON-ENERGI', 'LAINNYA'
            ]
        }

    def get_emission_sources(self, sector: str, start_year: int, end_year: int):
        """Mengambil data sumber emisi berdasarkan sektor dan rentang tahun"""
        if sector not in self.SHEET_MAPPING:
            return {}

        try:
            sheet_name = self.SHEET_MAPPING[sector]
            df = pd.read_excel(self.RAW_EXCEL_FILE, sheet_name=sheet_name)

            year_columns = {}
            sources = self.SOURCE_PATTERNS[sector]

            # Ambil data berdasarkan sumber dan tahun
            for source in sources:
                source_data = {}
                for year in range(start_year, end_year + 1):
                    col_name = f"{source}_{year}"
                    if col_name in df.columns:
                        source_data[str(year)] = df[col_name].fillna(0).tolist()
                if source_data:
                    year_columns[source] = source_data

            kabupaten_sources = {}
            for idx, row in df.iterrows():
                kabupaten = row.get('KABUPATEN', '')
                if not kabupaten:
                    continue

                kabupaten_data = {}
                for source in sources:
                    if source in year_columns:
                        values = []
                        for year in range(start_year, end_year + 1):
                            year_str = str(year)
                            if (
                                year_str in year_columns[source]
                                and idx < len(year_columns[source][year_str])
                            ):
                                values.append(year_columns[source][year_str][idx])
                        if values:
                            avg_emission = np.mean(values)
                            kabupaten_data[source] = float(avg_emission)

                if kabupaten_data:
                    kabupaten_sources[kabupaten] = kabupaten_data

            return kabupaten_sources

        except Exception as e:
            print(f"Error reading emission sources: {str(e)}")
            return {}

    def get_all_sectors_data(self, start_year: int, end_year: int):
        """Menggabungkan data dari semua sektor (opsi sektor = 'all')"""
        year_columns = [str(year) for year in range(start_year, end_year + 1)]
        combined_df = None

        for sector_key, sheet_name in self.SHEET_MAPPING.items():
            try:
                df = pd.read_excel(self.EXCEL_FILE, sheet_name=sheet_name)
                available_years = [col for col in year_columns if col in df.columns]
                if not available_years:
                    continue

                base_cols = ['KABUPATEN', 'PROVINSI']
                sector_data = df[base_cols + available_years].copy()

                if combined_df is None:
                    combined_df = sector_data.copy()
                else:
                    combined_df = pd.merge(
                        combined_df,
                        sector_data,
                        on=['KABUPATEN', 'PROVINSI'],
                        how='outer',
                        suffixes=('', f'_{sector_key}')
                    )

                    for year in available_years:
                        if f'{year}_{sector_key}' in combined_df.columns:
                            combined_df[year] = (
                                combined_df[year].fillna(0)
                                + combined_df[f'{year}_{sector_key}'].fillna(0)
                            )
                            combined_df.drop(f'{year}_{sector_key}', axis=1, inplace=True)

            except Exception as e:
                print(f"Error reading {sheet_name}: {str(e)}")
                continue

        if combined_df is None:
            raise ValueError("Could not load data from any sector")

        combined_df = combined_df.fillna(0)
        return combined_df

    def get_all_sectors_sources(self, start_year: int, end_year: int):
        """Menggabungkan sumber emisi dari semua sektor"""
        all_sectors = ['energi', 'kehutanan', 'limbah', 'pertanian', 'ippu']
        kabupaten_all_sources = {}

        for sector in all_sectors:
            sector_sources = self.get_emission_sources(sector, start_year, end_year)
            for kabupaten, sources in sector_sources.items():
                if kabupaten not in kabupaten_all_sources:
                    kabupaten_all_sources[kabupaten] = {}
                for source, value in sources.items():
                    prefixed_source = f"{sector.upper()}: {source}"
                    kabupaten_all_sources[kabupaten][prefixed_source] = value

        return kabupaten_all_sources

    def remove_outliers_zscore(self, X, df, threshold=None):
        """Menghapus outlier berdasarkan Z-score secara otomatis"""
        if threshold is None:
            threshold = self.ZSCORE_THRESHOLD

        row_means = X.mean(axis=1)
        z_scores = np.abs(stats.zscore(row_means))

        mask = z_scores <= threshold
        outlier_indices = np.where(~mask)[0]

        outliers_info = []
        for idx in outlier_indices:
            kabupaten = df.iloc[idx].get('KABUPATEN', 'Unknown')
            provinsi = df.iloc[idx].get('PROVINSI', 'Unknown')
            avg_emission = float(X[idx].mean())
            z_score = float(z_scores[idx])

            outliers_info.append({
                'kabupaten': kabupaten,
                'provinsi': provinsi,
                'avg_emission': avg_emission,
                'z_score': z_score
            })

        outliers_info.sort(key=lambda x: x['z_score'], reverse=True)
        return mask, outliers_info

    def create_derivative_features(self, X):
        """Buat fitur turunan: rata-rata, std, trend, dll"""
        n_samples = X.shape[0]

        # Fitur statistik
        means = X.mean(axis=1).reshape(-1, 1)
        stds = X.std(axis=1).reshape(-1, 1)
        mins = X.min(axis=1).reshape(-1, 1)
        maxs = X.max(axis=1).reshape(-1, 1)

        # Trend (slope dari linear regression)
        trends = np.zeros((n_samples, 1))
        for i in range(n_samples):
            x_range = np.arange(X.shape[1])
            slope, _ = np.polyfit(x_range, X[i], 1)
            trends[i] = slope

        # Variability (coefficient of variation)
        cv = stds / (np.abs(means) + 1e-8)

        # Gabungkan semua fitur
        X_augmented = np.hstack([
            X,           # Data original
            means,       # Rata-rata
            stds,        # Standar deviasi
            trends,      # Trend
            cv,          # Coefficient of variation
            mins,        # Minimum
            maxs         # Maximum
        ])

        return X_augmented

    def perform_clustering(self, start_year: int, end_year: int, sector: str, n_clusters: int):
        """Melakukan clustering GMM terhadap data emisi"""

        # === 1. Load data ===
        if sector.lower() == 'all':
            df = self.get_all_sectors_data(start_year, end_year)
        else:
            sheet_name = self.SHEET_MAPPING.get(sector.lower())
            if not sheet_name:
                raise ValueError(f"Unknown sector: {sector}")
            df = pd.read_excel(self.EXCEL_FILE, sheet_name=sheet_name)

        year_columns = [str(year) for year in range(start_year, end_year + 1)]
        missing_cols = [col for col in year_columns if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Columns {missing_cols} not found")

        df = df.fillna(0)
        X_original_data = df[year_columns].values

        # Hitung skewness per baris (kabupaten)
        row_skewness = [stats.skew(row) for row in X_original_data]
        print(f"Average row skewness: {np.mean(row_skewness):.2f}")

        # === 2. Buang data ekstrem >50.000 Gg ===
        EXTREME_THRESHOLD = 50000
        row_means = X_original_data.mean(axis=1)
        extreme_mask = row_means <= EXTREME_THRESHOLD
        extreme_indices = np.where(~extreme_mask)[0]

        extreme_outliers = []
        for idx in extreme_indices:
            kabupaten = df.iloc[idx].get('KABUPATEN', 'Unknown')
            provinsi = df.iloc[idx].get('PROVINSI', 'Unknown')
            avg_emission = float(X_original_data[idx].mean())

            extreme_outliers.append({
                'kabupaten': kabupaten,
                'provinsi': provinsi,
                'avg_emission': avg_emission,
                'reason': f'Extreme (>{EXTREME_THRESHOLD:,.0f} Gg)'
            })

        extreme_outliers.sort(key=lambda x: x['avg_emission'], reverse=True)

        df = df[extreme_mask].reset_index(drop=True)
        X_original_data = X_original_data[extreme_mask]

        # === 3. Hapus outlier berdasarkan Z-score ===
        mask, outliers_info = self.remove_outliers_zscore(X_original_data, df)
        df_original = df.copy()
        X_original = X_original_data.copy()

        for outlier in outliers_info:
            outlier['reason'] = f'Z-score ({outlier["z_score"]:.2f})'

        df = df[mask].reset_index(drop=True)
        X = X_original_data[mask]

        print(f"\n=== AFTER OUTLIER REMOVAL ===")
        print(f"Regions remaining: {len(df)}")
        print(f"Total outliers removed: {len(outliers_info)}")

        # === 4. FEATURE ENGINEERING - Tambah fitur turunan ===
        print(f"\n=== FEATURE ENGINEERING ===")
        X_augmented = self.create_derivative_features(X)

        # === 5. TRANSFORMASI DAN NORMALISASI (SIMPLE PIPELINE) ===
        # Gunakan PowerTransformer (Yeo-Johnson) yang dapat menangani nilai negatif + StandardScaler
        print("Step 1: PowerTransformer (Yeo-Johnson) to stabilize variance / reduce skewness")
        pt = PowerTransformer(method='yeo-johnson', standardize=False)  # tidak men-standarkan di sini
        X_pt = pt.fit_transform(X_augmented)

        print("Step 2: StandardScaler (final normalization)")
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_pt)

        transform_method = "PowerTransformer(Yeo-Johnson) + StandardScaler"

        # === 6. JALANKAN GMM CLUSTERING  ===
        print(f"\n=== GMM CLUSTERING (covariance_type='full') ===")
        print(f"Number of clusters: {n_clusters}")

        try:
            gmm = GaussianMixture(
                n_components=n_clusters,
                covariance_type='full', 
                random_state=100,
                n_init=30,
                reg_covar=1e-4,
                max_iter=500,
                init_params='kmeans',
                tol=1e-5
            )

            clusters = gmm.fit_predict(X_scaled)

            # Pastikan minimal 2 cluster
            if len(np.unique(clusters)) < 2:
                raise ValueError("GMM found less than 2 clusters; coba nilai n_clusters yang lain.")

            score = silhouette_score(X_scaled, clusters)
            print(f"Silhouette score: {score:.4f}")

        except Exception as e:
            raise RuntimeError(f"GMM clustering failed: {str(e)}")

        probabilities = gmm.predict_proba(X_scaled)

        # === 7. Evaluasi ===
        silhouette_avg = float(silhouette_score(X_scaled, clusters))
        silhouette_vals = silhouette_samples(X_scaled, clusters)

        silhouette_data = []
        for i in range(n_clusters):
            vals = silhouette_vals[clusters == i]
            vals.sort()
            cluster_silhouette = float(vals.mean()) if len(vals) > 0 else 0.0
            silhouette_data.append({
                'cluster_id': int(i),
                'values': vals.tolist(),
                'avg': cluster_silhouette
            })
            print(f"Cluster {i} - Size: {len(vals)}, Silhouette: {cluster_silhouette:.4f}")

        gmm_parameters = {
            'weights': gmm.weights_.tolist(),
            'means': gmm.means_.tolist(),
            'covariances': [],
            'n_features': len(year_columns),
            'n_features_augmented': X_scaled.shape[1],
            'feature_names': year_columns,
            'n_iterations': int(gmm.n_iter_),
            'converged': bool(gmm.converged_),
            'covariance_type': 'full',
            'transform_method': transform_method,
        }


        # === 10. Scatter Data ===
        scatter_data = []
        for idx in range(len(df)):
            kabupaten = df.iloc[idx].get('KABUPATEN', 'Unknown')
            provinsi = df.iloc[idx].get('PROVINSI', 'Unknown')
            cluster_id = int(clusters[idx])
            avg_emission = float(X[idx].mean())
            silhouette_val = float(silhouette_vals[idx])
            confidence = float(probabilities[idx, cluster_id])

            scatter_data.append({
                'kabupaten': kabupaten,
                'provinsi': provinsi,
                'cluster': cluster_id,
                'avg_emission': avg_emission,
                'silhouette': silhouette_val,
                'confidence': confidence
            })

        # === 11. Tambahkan kolom cluster ===
        df['Cluster'] = clusters.astype(int)
        for i in range(n_clusters):
            df[f'Prob_Cluster_{i+1}'] = probabilities[:, i]

        cluster_stats = []
        for i in range(n_clusters):
            mask_cluster = clusters == i
            avg_conf = float(probabilities[mask_cluster, i].mean()) if np.sum(mask_cluster) > 0 else 0.0
            cluster_stats.append({
                'cluster_id': int(i),
                'count': int(np.sum(mask_cluster)),
                'percentage': float(np.sum(mask_cluster) / len(df) * 100),
                'avg_confidence': avg_conf,
                'avg_emission': float(X[mask_cluster].mean()) if np.sum(mask_cluster) > 0 else 0.0
            })

        # === 12. Ambil sumber emisi ===
        if sector.lower() == 'all':
            emission_sources = self.get_all_sectors_sources(start_year, end_year)
        else:
            emission_sources = self.get_emission_sources(sector.lower(), start_year, end_year)

        # === 13. Data emisi per tahun untuk box plot ===
        yearly_emissions = {}
        for idx, row in df.iterrows():
            kabupaten = row.get('KABUPATEN', '')
            yearly_emissions[kabupaten] = {}
            for year_col in year_columns:
                yearly_emissions[kabupaten][year_col] = float(X[idx, year_columns.index(year_col)])

        # === 14. Susun hasil akhir ===
        all_outliers = extreme_outliers + outliers_info

        result = {
            'kabupaten_clusters': {},
            'cluster_stats': cluster_stats,
            'outliers': all_outliers,
            'extreme_outliers': extreme_outliers,
            'zscore_outliers': outliers_info,
            'total_regions': int(len(df_original)) + len(extreme_outliers),
            'extreme_removed': int(len(extreme_outliers)),
            'outliers_removed': int(len(outliers_info)),
            'regions_clustered': int(len(df)),
            'n_clusters': int(n_clusters),
            'silhouette_score': silhouette_avg,
            'silhouette_data': silhouette_data,
            'scatter_data': scatter_data,
            'emission_sources': emission_sources,
            'gmm_parameters': gmm_parameters,
            'outlier_method': 'Z-score + Extreme Filter',
            'zscore_threshold': self.ZSCORE_THRESHOLD,
            'yearly_emissions': yearly_emissions,
            'year_columns': year_columns,
            'transform_method': transform_method
        }

        for idx, row in df.iterrows():
            kabupaten = row.get('KABUPATEN', '')
            provinsi = row.get('PROVINSI', '')
            cluster_id = int(row['Cluster'])

            cluster_info = {
                'cluster': cluster_id,
                'provinsi': provinsi,
                'probabilities': [float(row[f'Prob_Cluster_{i+1}']) for i in range(n_clusters)],
                'avg_emission': float(X[idx].mean()),
                'yearly_data': yearly_emissions[kabupaten]
            }

            if kabupaten in emission_sources:
                cluster_info['sources'] = emission_sources[kabupaten]

            result['kabupaten_clusters'][kabupaten] = cluster_info

        print(f"\n=== CLUSTERING COMPLETE ===")
        return result
