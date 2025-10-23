from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import json
import os

from clustering_service import ClusteringService
from upload_service import UploadService

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ClusteringRequest(BaseModel):
    start_year: int
    end_year: int
    sector: str
    n_clusters: int = 3
    remove_outliers: bool = True
    percentile_threshold: int = 98

class ClusteringResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class UploadResponse(BaseModel):
    success: bool
    message: str
    processed_file: Optional[str] = None

# Global paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GEOJSON_FILE = os.path.join(os.path.dirname(BASE_DIR), 'Frontend', 'geojson', 'peta_indonesia_update3.geojson')

# Initialize services
clustering_service = ClusteringService()
upload_service = UploadService()

@app.get("/")
def read_root():
    return {"message": "Emissions Clustering API", "status": "running"}

# ============== CLUSTERING ENDPOINTS ==============
@app.post("/api/clustering", response_model=ClusteringResponse)
async def run_clustering(request: ClusteringRequest):
    """Run clustering analysis and return results"""
    try:
        if request.start_year < 2000 or request.end_year > 2024:
            raise HTTPException(status_code=400, detail="Tahun harus 2000-2024")
        
        if request.start_year > request.end_year:
            raise HTTPException(status_code=400, detail="Tahun akhir tidak bisa dibawah tahun awal")
        
        if request.n_clusters < 2:
            raise HTTPException(status_code=400, detail="Jumlah cluster harus minimal 2")
        
        if request.n_clusters > 20:
            raise HTTPException(status_code=400, detail="Jumlah cluster maksimal 20")
        
        result = clustering_service.perform_clustering(
            start_year=request.start_year,
            end_year=request.end_year,
            sector=request.sector,
            n_clusters=request.n_clusters,
            remove_outliers=request.remove_outliers,
            percentile_threshold=request.percentile_threshold
        )
        
        return ClusteringResponse(
            success=True,
            message="Clustering completed successfully",
            data=result
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error {str(e)}")

# ============== UPLOAD ENDPOINTS ==============
@app.get("/api/download-template")
async def download_template():
    """Download Template Excel untuk upload data emisi"""
    try:
        template_path = upload_service.get_template_path()
        if not os.path.exists(template_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Template file tidak ditemukan"
            )
        
        return FileResponse(
            path=template_path,
            filename='Template_emisi.xlsx',
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error downloading template: {str(e)}"
        )

@app.get("/api/download-raw-dataset")
async def download_raw_dataset():
    """Download Dataset Mentah Original yang TIDAK PERNAH BERUBAH"""
    try:
        original_path = upload_service.get_original_raw_path()
        if not os.path.exists(original_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Dataset mentah original tidak ditemukan"
            )
        
        return FileResponse(
            path=original_path,
            filename='data_emisi_klhk_original.xlsx',
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error downloading original dataset: {str(e)}"
        )

@app.get("/api/download-current-dataset")
async def download_current_dataset():
    """Download Dataset Saat Ini yang Digunakan"""
    try:
        response = upload_service.get_current_dataset()
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error downloading current dataset: {str(e)}"
        )

@app.post("/api/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload raw emission dataset and process it"""
    try:
        response = await upload_service.upload_and_process(file)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )

# ============== OTHER ENDPOINTS ==============
@app.get("/api/geojson")
async def get_geojson():
    """Return GeoJSON data"""
    try:
        with open(GEOJSON_FILE, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        return geojson_data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="GeoJSON file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading GeoJSON: {str(e)}")

@app.get("/api/sectors")
async def get_sectors():
    """Return available sectors"""
    return {
        "sectors": [
            {"value": "all", "label": "Semua Sektor"},
            {"value": "energi", "label": "Energi"},
            {"value": "kehutanan", "label": "Kehutanan"},
            {"value": "limbah", "label": "Limbah"},
            {"value": "ippu", "label": "IPPU"},
            {"value": "pertanian", "label": "Pertanian"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)