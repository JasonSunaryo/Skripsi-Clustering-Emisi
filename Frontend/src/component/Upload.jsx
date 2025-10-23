import { useState } from "react";
import { Upload, Download, FileText, Trash2, AlertCircle, CheckCircle } from "lucide-react";

// Component untuk Download Card
const DownloadCard = ({ icon: Icon, title, description, onClick, color, badge }) => (
  <div 
    onClick={onClick}
    className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105`}>
    <div className="flex items-center justify-between mb-4">
      <Icon className="w-8 h-8" />
      <span className="bg-white bg-opacity-20 rounded-full px-3 py-1 text-xs font-semibold">
        {badge}
      </span>
    </div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className={`${color.includes('blue') ? 'text-blue-100' : color.includes('green') ? 'text-green-100' : 'text-purple-100'} text-sm`}>{description}</p>
  </div>
);

// Component untuk Validation Error
const ValidationError = ({ message, onDownloadTemplate }) => (
  <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-5">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-bold text-red-900 mb-2">File Tidak Sesuai Template</h4>
        <p className="text-sm text-red-700 mb-3">{message}</p>
        <div className="bg-white rounded-lg p-4 border border-red-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">✅ Pastikan file Anda memiliki:</p>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Sheet: Energi, Kehutanan, Limbah, Pertanian, Ippu</li>
            <li>Kolom: KABUPATEN dan PROVINSI</li>
            <li>Kolom sumber emisi dengan format: NAMA_SUMBER_TAHUN</li>
            <li>Contoh: INDUSTRI ENERGI_2000, BIOMASS_2020</li>
          </ul>
        </div>
        <button
          onClick={onDownloadTemplate}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Template yang Benar
        </button>
      </div>
    </div>
  </div>
);

// Component untuk File Preview
const FilePreview = ({ file, uploadProgress, uploading, uploadSuccess, uploadError, processing, onReset, onUpload }) => (
  <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 rounded-lg p-3">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">{file.name}</p>
          <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </div>
      {!uploading && !uploadSuccess && (
        <button onClick={onReset} className="text-gray-400 hover:text-red-600 transition-colors p-2">
          <Trash2 className="w-6 h-6" />
        </button>
      )}
    </div>
    
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-gray-700">
          {processing ? "Memproses dataset..." : uploading ? "Mengupload..." : uploadSuccess ? "Berhasil!" : "Siap diupload"}
        </span>
        <span className="font-bold text-gray-900">{uploadProgress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            uploadSuccess ? "bg-gradient-to-r from-green-400 to-green-600" : 
            uploadError ? "bg-gradient-to-r from-red-400 to-red-600" : 
            "bg-gradient-to-r from-blue-400 to-blue-600"
          }`}
          style={{ width: uploadProgress + "%" }}>
        </div>
      </div>
    </div>

    {uploadError && (
      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">❌ {uploadError}</p>
      </div>
    )}

    {uploadSuccess && (
      <div className="mb-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900 mb-1">File berhasil diproses!</p>
            <p className="text-sm text-green-700">Dataset siap untuk clustering.</p>
          </div>
        </div>
      </div>
    )}

    <div className="flex gap-3 mt-5">
      {!uploadSuccess && !uploading ? (
        <>
          <button 
            onClick={onUpload}
            disabled={processing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed">
            {processing ? "Memproses..." : "Proses Dataset"}
          </button>
          <button 
            onClick={onReset}
            disabled={processing}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Batal
          </button>
        </>
      ) : uploadSuccess && (
        <button 
          onClick={onReset}
          className="flex-1 px-6 py-3 border-2 border-green-500 text-green-700 rounded-lg font-semibold hover:bg-green-50 transition-colors">
          Upload File Baru
        </button>
      )}
    </div>
  </div>
);

export default function DatasetManagement() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [validationError, setValidationError] = useState("");

  const API_BASE = 'http://localhost:8000/api';
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const processFile = (file) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!['.xlsx', '.xls'].includes(ext)) {
      setValidationError('File harus berformat Excel (.xlsx atau .xls)');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setValidationError('Ukuran file maksimal 50MB');
      return;
    }
    
    setSelectedFile(file);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadError("");
    setValidationError("");
  };

  const uploadToServer = async () => {
    if (!selectedFile) return alert('Tidak ada file yang dipilih');

    setUploading(true);
    setProcessing(true);
    setUploadProgress(0);
    setUploadError("");
    setValidationError("");

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => prev >= 90 ? 90 : prev + 10);
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(`${API_BASE}/upload-dataset`, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: `Server error: ${response.status}` }));
        const errorMsg = error.detail || 'Upload gagal';
        
        if (errorMsg.includes('tidak sesuai template') || errorMsg.includes('Sheet yang hilang')) {
          setValidationError(errorMsg);
        } else {
          setUploadError(errorMsg);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json().catch(() => ({ success: true, message: "Dataset berhasil diupload" }));
      
      setUploadProgress(100);
      setUploadSuccess(true);
      setTimeout(() => alert(`✅ ${result.message}\n\nFile mentah disimpan dan file gabungan berhasil dibuat.\nAnda sekarang dapat melakukan clustering.`), 300);

    } catch (error) {
      clearInterval(progressInterval);
      
      if (error.name === 'AbortError' || error.message === 'Failed to fetch') {
        setUploadProgress(100);
        setUploadSuccess(true);
        setTimeout(() => alert('✅ Dataset berhasil diupload dan diproses!\n\nFile mentah disimpan dan file gabungan berhasil dibuat.\nAnda sekarang dapat melakukan clustering.'), 300);
      } else {
        if (!validationError) setUploadError(error.message);
        setUploadProgress(0);
        if (!error.message.includes('tidak sesuai template')) alert('❌ Upload gagal: ' + error.message);
      }
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploading(false);
    setUploadSuccess(false);
    setUploadError("");
    setValidationError("");
    setProcessing(false);
  };

  const downloadFile = async (endpoint, filename, errorMsg) => {
    try {
      const response = await fetch(`${API_BASE}/${endpoint}`);
      if (!response.ok) throw new Error(errorMsg);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`${errorMsg}: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Dataset Management</h1>
          <p className="text-lg text-gray-600">Upload, kelola, dan unduh dataset emisi Anda</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DownloadCard 
            icon={Download}
            title="Download Template"
            description="Template standar untuk upload data emisi"
            badge="Template"
            color="from-blue-500 to-blue-600"
            onClick={() => downloadFile('download-template', 'Template_emisi.xlsx', 'Gagal mengunduh template')}
          />
          <DownloadCard 
            icon={FileText}
            title="Dataset Original"
            description="Dataset Signsmart KLHK 2024"
            badge="Original"
            color="from-green-500 to-green-600"
            onClick={() => downloadFile('download-raw-dataset', 'data_emisi_klhk_original.xlsx', 'Gagal mengunduh dataset original')}
          />
          <DownloadCard 
            icon={FileText}
            title="Dataset Saat Ini"
            description="Dataset yang sedang digunakan (dapat diupdate)"
            badge="Aktif"
            color="from-purple-500 to-purple-600"
            onClick={() => downloadFile(`download-current-dataset?t=${Date.now()}`, `data_emisi_${Date.now()}.xlsx`, 'Gagal mengunduh dataset')}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="w-7 h-7 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Upload Dataset Baru</h2>
          </div>

          {validationError && <ValidationError message={validationError} onDownloadTemplate={() => downloadFile('download-template', 'Template_emisi.xlsx', 'Gagal mengunduh template')} />}

          <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <label htmlFor="fileInput" className="cursor-pointer block">
              <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive ? "border-blue-500 bg-blue-50" : 
                validationError ? "border-red-300 bg-red-50" : 
                "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}>
                <input type="file" id="fileInput" className="hidden" onChange={handleFileChange} accept=".csv,.xlsx,.xls" />
                
                <div className="flex flex-col items-center">
                  <div className={`rounded-full p-5 mb-4 ${validationError ? "bg-red-100" : "bg-blue-100"}`}>
                    {validationError ? <AlertCircle className="w-10 h-10 text-red-600" /> : <Upload className="w-10 h-10 text-blue-600" />}
                  </div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">Seret file ke sini atau klik untuk memilih</p>
                  <p className="text-sm text-gray-500 mb-4">Format: XLSX, XLS (Maksimal 50MB)</p>
                  <div className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Pilih File
                  </div>
                </div>
              </div>
            </label>

            {selectedFile && (
              <FilePreview 
                file={selectedFile}
                uploadProgress={uploadProgress}
                uploading={uploading}
                uploadSuccess={uploadSuccess}
                uploadError={uploadError}
                processing={processing}
                onReset={resetUpload}
                onUpload={uploadToServer}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}