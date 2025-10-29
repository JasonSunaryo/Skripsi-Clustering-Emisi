import { ExternalLink } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="border border-gray-200 rounded-lg p-6">
        {/* Header */}
        <h1 className="text-xl font-semibold text-gray-800 mb-6">
          Tentang Dataset Emisi Indonesia
        </h1>

        {/* Dataset Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Gambaran Dataset
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Sistem pemantauan emisi komprehensif ini menyediakan data emisi gas rumah kaca yang terperinci di seluruh 
            Indonesia dari tahun 2000 hingga 2024. Dataset ini berisi 2.770 total data point yang terdistribusi 
            dalam 5 sheet sektor komprehensif, mencakup emisi dari berbagai wilayah administratif dan sektor ekonomi 
            di seluruh nusantara.
          </p>
        </div>

        {/* Data Structure */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Struktur Data
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex">
              <span className="font-medium text-gray-700 w-32">Total Record:</span>
              <span className="text-gray-600">2.770 entri</span>
            </div>
            
            <div className="flex">
              <span className="font-medium text-gray-700 w-40">Cakupan Geografis:</span>
              <span className="text-gray-600">Seluruh provinsi Indonesia</span>
            </div>
            
            <div className="flex">
              <span className="font-medium text-gray-700 w-32">Periode Waktu:</span>
              <span className="text-gray-600">2000-2024 (25 tahun)</span>
            </div>
            
            <div className="flex">
              <span className="font-medium text-gray-700 w-40">Level Administratif:</span>
              <span className="text-gray-600">Provinsi dan Kabupaten</span>
            </div>
            
            <div className="flex">
              <span className="font-medium text-gray-700 w-32">Format:</span>
              <span className="text-gray-600">Excel (.xlsx)</span>
            </div>
            
            <div className="flex">
              <span className="font-medium text-gray-700 w-40">Frekuensi Update:</span>
              <span className="text-gray-600">Tahunan</span>
            </div>
            
            <div className="flex">
              <span className="font-medium text-gray-700 w-32">Sheet:</span>
              <span className="text-gray-600">5 sheet per sektor</span>
            </div>
            
            <div className="flex">
              <span className="font-medium text-gray-700 w-40">Satuan:</span>
              <span className="text-gray-600">Gg (Gigagram)</span>
            </div>
          </div>
        </div>

        {/* Sector Coverage */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Cakupan Sektor
          </h2>
          
          <div className="space-y-4">
            {/* Sektor Pertanian */}
            <div className="bg-green-50 border-l-4 border-green-400 p-3">
              <h3 className="font-medium text-gray-800 text-sm mb-1">Sektor Pertanian</h3>
              <p className="text-gray-600 text-xs">
                6 subkategori: Budidaya Padi, Peternakan, N₂O dari Tanah Terkelola, Urea, Pengapuran, Pembakaran Biomassa
              </p>
            </div>

            {/* Sektor IPPU */}
            <div className="bg-purple-50 border-l-4 border-purple-400 p-3">
              <h3 className="font-medium text-gray-800 text-sm mb-1">Sektor IPPU (Proses Industri dan Penggunaan Produk)</h3>
              <p className="text-gray-600 text-xs">
                5 subkategori: Industri Kimia, Industri Mineral, Industri Logam, Industri Non-Energi, Lainnya
              </p>
            </div>

            {/* Sektor Kehutanan */}
            <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3">
              <h3 className="font-medium text-gray-800 text-sm mb-1">Sektor Kehutanan</h3>
              <p className="text-gray-600 text-xs">
                3 subkategori: Kebakaran Gambut, Dekomposisi Gambut, Biomassa
              </p>
            </div>

            {/* Sektor Energi */}
            <div className="bg-orange-50 border-l-4 border-orange-400 p-3">
              <h3 className="font-medium text-gray-800 text-sm mb-1">Sektor Energi</h3>
              <p className="text-gray-600 text-xs">
                6 subkategori: Transportasi, Industri Energi, Minyak & Gas Bumi, Industri Batu Bara, Perkantoran & Pemukiman, Manufaktur & Konstruksi
              </p>
            </div>

            {/* Sektor Limbah */}
            <div className="bg-red-50 border-l-4 border-red-400 p-3">
              <h3 className="font-medium text-gray-800 text-sm mb-1">Sektor Limbah</h3>
              <p className="text-gray-600 text-xs">
                5 subkategori: Limbah Padat, Pembakaran, Limbah Cair Industri, Limbah Cair Domestik, Pengolahan Secara Biologis
              </p>
            </div>
          </div>
        </div>

        {/* Data Source */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Sumber Data
          </h2>
          <a 
            href="https://signsmart.menlhk.go.id/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            <ExternalLink size={16} />
            Buka Dashboard MENLHK SignSmart
          </a>
        </div>

        {/* Usage Guidelines */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Panduan Penggunaan
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Pilih rentang tahun yang ingin dianalisis (2000-2024)</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Tentukan sektor emisi yang akan diklasterisasi</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Atur jumlah cluster sesuai kebutuhan analisis (2-10 cluster)</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Evaluasi hasil clustering menggunakan Silhouette Score dan visualisasi peta</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}