# Import library yang digunakan
import pandas as pd                      
import numpy as np                       
from sklearn.mixture import GaussianMixture  
from sklearn.preprocessing import StandardScaler  
from sklearn.metrics import silhouette_score, silhouette_samples  
import os                               # Untuk operasi file dan path

# Definisi kelas utama untuk proses clustering
class ClusteringService:
    def __init__(self):
        # Menentukan direktori dasar dari file saat ini
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        # Menentukan folder tempat file Excel disimpan
        self.EXCEL_DIR = os.path.join(self.BASE_DIR, 'Excel')
        # Menentukan path file Excel hasil penggabungan data
        self.EXCEL_FILE = os.path.join(self.EXCEL_DIR, 'data_emisi_gabungan.xlsx')
        # Menentukan path file Excel mentah (belum diolah)
        self.RAW_EXCEL_FILE = os.path.join(self.EXCEL_DIR, 'data_emisi_klhk_mentah.xlsx')
        
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
            'energi': ['INDUSTRI BATU BARA', 'INDUSTRI ENERGI', 'MANUFAKTUR & KONSTRUKSI', 
                       'MINYAK & GAS BUMI', 'PERKANTORAN & PEMUKIMAN', 'TRANSPORTASI'],
            'kehutanan': ['BIOMASS', 'PEAT DECOMPOSITION', 'PEAT FIRE'],
            'limbah': ['LIMBAH CAIR DOMESTIK', 'LIMBAH CAIR INDUSTRI', 'LIMBAH PADAT', 
                       'PEMBAKARAN', 'PENGOLAHAN SECARA BIOLOGIS'],
            'pertanian': ['Biomass Burning', 'Liming', 'Livestock', 'N2O from Managed Soils', 
                          'Rice Cultivation', 'Urea'],
            'ippu': ['INDUSTRI KIMIA', 'INDUSTRI LOGAM', 'INDUSTRI MINERAL', 
                     'INDUSTRI NON-ENERGI', 'LAINNYA']
        }
    
    def get_emission_sources(self, sector: str, start_year: int, end_year: int):
        """Mengambil data sumber emisi berdasarkan sektor dan rentang tahun"""
        if sector not in self.SHEET_MAPPING:
            return {}
        
        try:
            # Ambil sheet Excel sesuai sektor
            sheet_name = self.SHEET_MAPPING[sector]
            df = pd.read_excel(self.RAW_EXCEL_FILE, sheet_name=sheet_name)
            
            year_columns = {}
            sources = self.SOURCE_PATTERNS[sector]
            
            # Ambil data berdasarkan sumber dan tahun
            for source in sources:
                source_data = {}
                for year in range(start_year, end_year + 1):
                    col_name = f"{source}_{year}"  # Contoh: "TRANSPORTASI_2019"
                    if col_name in df.columns:
                        source_data[str(year)] = df[col_name].fillna(0).tolist()
                if source_data:
                    year_columns[source] = source_data
            
            kabupaten_sources = {}
            # Iterasi setiap baris (kabupaten)
            for idx, row in df.iterrows():
                kabupaten = row.get('KABUPATEN', '')
                if not kabupaten:
                    continue
                    
                kabupaten_data = {}
                # Hitung rata-rata emisi setiap sumber untuk kabupaten tersebut
                for source in sources:
                    if source in year_columns:
                        values = []
                        for year in range(start_year, end_year + 1):
                            year_str = str(year)
                            if year_str in year_columns[source] and idx < len(year_columns[source][year_str]):
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
                # Baca data dari setiap sheet
                df = pd.read_excel(self.EXCEL_FILE, sheet_name=sheet_name)
                
                # Cek kolom tahun yang tersedia
                available_years = [col for col in year_columns if col in df.columns]
                if not available_years:
                    continue
                
                base_cols = ['KABUPATEN', 'PROVINSI']
                sector_data = df[base_cols + available_years].copy()
                
                # Jika belum ada dataframe gabungan, buat baru
                if combined_df is None:
                    combined_df = sector_data.copy()
                else:
                    # Gabungkan dataframe berdasarkan kabupaten & provinsi
                    combined_df = pd.merge(
                        combined_df, 
                        sector_data, 
                        on=['KABUPATEN', 'PROVINSI'], 
                        how='outer',
                        suffixes=('', f'_{sector_key}')
                    )
                    
                    # Jumlahkan nilai dari sektor berbeda pada tahun yang sama
                    for year in available_years:
                        if f'{year}_{sector_key}' in combined_df.columns:
                            combined_df[year] = combined_df[year].fillna(0) + combined_df[f'{year}_{sector_key}'].fillna(0)
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
                
                # Tambahkan prefix sektor agar nama sumber unik
                for source, value in sources.items():
                    prefixed_source = f"{sector.upper()}: {source}"
                    kabupaten_all_sources[kabupaten][prefixed_source] = value
        
        return kabupaten_all_sources
    
    def remove_outliers_percentile(self, X, threshold=99):
        """Menghapus data ekstrem (outlier) berdasarkan persentil"""
        row_means = X.mean(axis=1)  # Rata-rata emisi per kabupaten
        percentile_value = np.percentile(row_means, threshold)  # Nilai batas persentil (misal 99%)
        mask = row_means <= percentile_value  # True jika masih dalam batas
        return mask  # Mengembalikan mask untuk memilih data non-outlier
    
    def perform_clustering(self, start_year: int, end_year: int, sector: str, 
                          n_clusters: int, remove_outliers: bool, 
                          percentile_threshold: int):
        """Melakukan clustering GMM terhadap data emisi"""
        
        # === 1. Load data ===
        if sector.lower() == 'all':
            df = self.get_all_sectors_data(start_year, end_year)
        else:
            sheet_name = self.SHEET_MAPPING.get(sector.lower())
            if not sheet_name:
                raise ValueError(f"Unknown sector: {sector}")
            df = pd.read_excel(self.EXCEL_FILE, sheet_name=sheet_name)
        
        # Ambil kolom tahun
        year_columns = [str(year) for year in range(start_year, end_year + 1)]
        missing_cols = [col for col in year_columns if col not in df.columns]
        
        if missing_cols:
            raise ValueError(f"Columns {missing_cols} not found")
        
        X = df[year_columns].fillna(0).values  # Ubah data ke array numpy
        outliers_info = []
        
        # === 2. Hapus outlier (jika diaktifkan) ===
        if remove_outliers:
            mask = self.remove_outliers_percentile(X, threshold=percentile_threshold)
            outlier_indices = np.where(~mask)[0]
            
            # Simpan informasi kabupaten yang dihapus
            for idx in outlier_indices:
                kabupaten = df.iloc[idx].get('KABUPATEN', 'Unknown')
                provinsi = df.iloc[idx].get('PROVINSI', 'Unknown')
                avg_emission = float(X[idx].mean())
                
                outliers_info.append({
                    'kabupaten': kabupaten,
                    'provinsi': provinsi,
                    'avg_emission': avg_emission
                })
            
            # Urutkan dari emisi tertinggi
            outliers_info.sort(key=lambda x: x['avg_emission'], reverse=True)
            df = df[mask].reset_index(drop=True)
            X = X[mask]
        
        # === 3. Normalisasi data ===
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # === 4. Inisialisasi dan latih model GMM ===
        gmm = GaussianMixture(
            n_components=n_clusters,
            covariance_type='full',
            random_state=100,
            n_init=10,
            reg_covar=1e-6,
            max_iter=200
        )
        
        clusters = gmm.fit_predict(X_scaled)  # Prediksi cluster untuk tiap kabupaten
        probabilities = gmm.predict_proba(X_scaled)  # Probabilitas keanggotaan tiap cluster
        
        # Hitung log-likelihood (kecocokan model)
        log_likelihood = float(gmm.score(X_scaled) * len(X_scaled))
        
        # === 5. Simpan parameter model ===
        gmm_parameters = {
            'weights': gmm.weights_.tolist(),
            'means': scaler.inverse_transform(gmm.means_).tolist(),
            'covariances': [],
            'n_features': len(year_columns),
            'feature_names': year_columns,
            'log_likelihood': log_likelihood,
            'n_iterations': int(gmm.n_iter_),
            'converged': bool(gmm.converged_),
        }
        
        # Kembalikan covariance ke skala asli
        for i in range(n_clusters):
            cov_scaled = gmm.covariances_[i]
            scale_matrix = np.diag(scaler.scale_)
            cov_original = scale_matrix @ cov_scaled @ scale_matrix
            gmm_parameters['covariances'].append(cov_original.tolist())
        
        # === 6. Hitung metrik evaluasi clustering ===
        silhouette_avg = float(silhouette_score(X_scaled, clusters))
        silhouette_vals = silhouette_samples(X_scaled, clusters)
        
        # Siapkan data untuk visualisasi silhouette
        silhouette_data = []
        for i in range(n_clusters):
            cluster_silhouette_vals = silhouette_vals[clusters == i]
            cluster_silhouette_vals.sort()
            silhouette_data.append({
                'cluster_id': int(i),
                'values': cluster_silhouette_vals.tolist(),
                'avg': float(cluster_silhouette_vals.mean())
            })
        
        # === 7. Siapkan data scatter untuk visualisasi ===
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
        
        # === 8. Tambahkan cluster ke dataframe ===
        df['Cluster'] = clusters.astype(int)
        for i in range(n_clusters):
            df[f'Prob_Cluster_{i+1}'] = probabilities[:, i]
        
        # Hitung statistik tiap cluster
        cluster_stats = []
        for i in range(n_clusters):
            mask = clusters == i
            cluster_stats.append({
                'cluster_id': int(i),
                'count': int(np.sum(mask)),
                'percentage': float(np.sum(mask) / len(df) * 100),
                'avg_confidence': float(probabilities[mask, i].mean()),
                'avg_emission': float(X[mask].mean())
            })
        
        # === 9. Ambil data sumber emisi sesuai sektor ===
        if sector.lower() == 'all':
            emission_sources = self.get_all_sectors_sources(start_year, end_year)
        else:
            emission_sources = self.get_emission_sources(sector.lower(), start_year, end_year)
        
        # === 10. Bangun hasil akhir ===
        result = {
            'kabupaten_clusters': {},
            'cluster_stats': cluster_stats,
            'outliers': outliers_info,
            'total_regions': int(len(df)),
            'outliers_removed': int(len(outliers_info)),
            'n_clusters': int(n_clusters),
            'silhouette_score': silhouette_avg,
            'silhouette_data': silhouette_data,
            'scatter_data': scatter_data,
            'emission_sources': emission_sources,
            'gmm_parameters': gmm_parameters
        }
        
        # === 11. Pemetaan kabupaten ke cluster-nya ===
        for idx, row in df.iterrows():
            kabupaten = row.get('KABUPATEN', '')
            provinsi = row.get('PROVINSI', '')
            cluster_id = int(row['Cluster'])
            
            cluster_info = {
                'cluster': cluster_id,
                'provinsi': provinsi,
                'probabilities': [float(row[f'Prob_Cluster_{i+1}']) for i in range(n_clusters)],
                'avg_emission': float(X[idx].mean())
            }
            
            if kabupaten in emission_sources:
                cluster_info['sources'] = emission_sources[kabupaten]
            
            result['kabupaten_clusters'][kabupaten] = cluster_info
        
        # Kembalikan hasil akhir clustering
        return result
