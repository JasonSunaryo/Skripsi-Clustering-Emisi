from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
import pandas as pd
import os
import shutil
from datetime import datetime

class UploadService:
    def __init__(self):
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.EXCEL_DIR = os.path.join(self.BASE_DIR, 'Excel')
        self.EXCEL_FILE = os.path.join(self.EXCEL_DIR, 'data_emisi_gabungan.xlsx')
        self.RAW_EXCEL_FILE = os.path.join(self.EXCEL_DIR, 'data_emisi_klhk_mentah.xlsx')
        self.ORIGINAL_RAW_FILE = os.path.join(self.EXCEL_DIR, 'data_emisi_klhk_original.xlsx')
        self.TEMPLATE_FILE = os.path.join(self.EXCEL_DIR, 'Template_emisi.xlsx')

        # Initialize original file backup
        if not os.path.exists(self.ORIGINAL_RAW_FILE) and os.path.exists(self.RAW_EXCEL_FILE):
            shutil.copy2(self.RAW_EXCEL_FILE, self.ORIGINAL_RAW_FILE)
            print(f"📦 Created original backup: {self.ORIGINAL_RAW_FILE}")

        self.SOURCE_PATTERNS = {
            'Energi': ['INDUSTRI BATU BARA', 'INDUSTRI ENERGI', 'MANUFAKTUR & KONSTRUKSI',
                       'MINYAK & GAS BUMI', 'PERKANTORAN & PEMUKIMAN', 'TRANSPORTASI'],
            'Kehutanan': ['BIOMASS', 'PEAT DECOMPOSITION', 'PEAT FIRE'],
            'Limbah': ['LIMBAH CAIR DOMESTIK', 'LIMBAH CAIR INDUSTRI', 'LIMBAH PADAT',
                       'PEMBAKARAN', 'PENGOLAHAN SECARA BIOLOGIS'],
            'Pertanian': ['Biomass Burning', 'Liming', 'Livestock', 'N2O from Managed Soils',
                          'Rice Cultivation', 'Urea'],
            'Ippu': ['INDUSTRI KIMIA', 'INDUSTRI LOGAM', 'INDUSTRI MINERAL',
                     'INDUSTRI NON-ENERGI', 'LAINNYA']
        }

    def get_template_path(self):
        """Return template file path"""
        return self.TEMPLATE_FILE

    def get_original_raw_path(self):
        """Return original raw file path"""
        return self.ORIGINAL_RAW_FILE

    def get_current_dataset(self):
        """Return current dataset file"""
        if not os.path.exists(self.RAW_EXCEL_FILE):
            raise HTTPException(
                status_code=404,
                detail=f"Dataset tidak ditemukan"
            )

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        return FileResponse(
            path=self.RAW_EXCEL_FILE,
            filename=f'data_emisi_saat_ini_{timestamp}.xlsx',
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        )

    def validate_file_structure(self, file_path: str):
        """Validate uploaded file matches the template structure"""
        try:
            required_sheets = ['Energi', 'Kehutanan', 'Limbah', 'Pertanian', 'Ippu']

            expected_sources = self.SOURCE_PATTERNS

            xl_file = pd.ExcelFile(file_path)

            # Check missing sheets
            missing_sheets = [sheet for sheet in required_sheets if sheet not in xl_file.sheet_names]
            if missing_sheets:
                return False, f"Sheet yang hilang: {', '.join(missing_sheets)}"

            # Validate each sheet
            for sheet_name, sources in expected_sources.items():
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name)

                    if 'KABUPATEN' not in df.columns or 'PROVINSI' not in df.columns:
                        return False, f"Sheet '{sheet_name}' harus memiliki kolom KABUPATEN dan PROVINSI"

                    missing_sources = []
                    for source in sources:
                        has_source = any(f"{source}_" in col for col in df.columns)
                        if not has_source:
                            missing_sources.append(source)

                    if missing_sources:
                        return False, f"Sheet '{sheet_name}' tidak memiliki data untuk sumber: {', '.join(missing_sources[:3])}{'...' if len(missing_sources) > 3 else ''}"

                    expected_year_pattern = any(
                        any(f"{source}_20" in col for source in sources)
                        for col in df.columns
                    )

                    if not expected_year_pattern:
                        return False, f"Sheet '{sheet_name}' tidak memiliki format kolom tahun yang benar (contoh: INDUSTRI ENERGI_2000)"

                except Exception as e:
                    return False, f"Error membaca sheet '{sheet_name}': {str(e)}"

            return True, "File valid"

        except Exception as e:
            return False, f"Error validasi file: {str(e)}"

    def process_uploaded_file(self, file_path: str):
        """Process uploaded raw data file and create aggregated file"""
        try:
            print(f"🔄 Starting file processing...")
            print(f"📂 Source file: {file_path}")
            print(f"📂 Target RAW file: {self.RAW_EXCEL_FILE}")
            print(f"📂 Target EXCEL file: {self.EXCEL_FILE}")

            # Replace the old raw file directly (no backup)
            shutil.copy2(file_path, self.RAW_EXCEL_FILE)
            print(f"✅ Raw file updated: {self.RAW_EXCEL_FILE}")

            # Create aggregated Excel
            writer = pd.ExcelWriter(self.EXCEL_FILE, engine='openpyxl')

            for sheet_name, sources in self.SOURCE_PATTERNS.items():
                print(f"⚙️ Processing sheet: {sheet_name}")
                df_raw = pd.read_excel(file_path, sheet_name=sheet_name)

                base_cols = ['KABUPATEN', 'PROVINSI']
                df_aggregated = df_raw[base_cols].copy()

                for year in range(2000, 2025):
                    year_str = str(year)
                    year_total = pd.Series(0, index=df_raw.index)

                    for source in sources:
                        col_name = f"{source}_{year}"
                        if col_name in df_raw.columns:
                            year_total += df_raw[col_name].fillna(0)

                    df_aggregated[year_str] = year_total

                df_aggregated.to_excel(writer, sheet_name=sheet_name, index=False)
                print(f"✅ Sheet {sheet_name} processed")

            writer.close()
            print(f"✅ Aggregated file created: {self.EXCEL_FILE}")

            return True, "File processed successfully"

        except Exception as e:
            print(f"❌ Error in process_uploaded_file: {str(e)}")
            return False, f"Error processing file: {str(e)}"

    async def upload_and_process(self, file: UploadFile):
        """Upload and process emission dataset (no backup or uploads folder)"""
        try:
            print(f"📥 Receiving file: {file.filename}")

            if not file.filename.endswith(('.xlsx', '.xls')):
                raise HTTPException(status_code=400, detail="File harus berformat Excel (.xlsx atau .xls)")

            # Save temporarily in same directory (no uploads folder)
            temp_file_path = os.path.join(self.EXCEL_DIR, f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Validate structure
            print(f"🔍 Validating file structure...")
            is_valid, error_message = self.validate_file_structure(temp_file_path)
            if not is_valid:
                os.remove(temp_file_path)
                raise HTTPException(status_code=400, detail=f"File tidak sesuai template: {error_message}")

            # Process file
            print(f"⚙️ Processing file...")
            success, message = self.process_uploaded_file(temp_file_path)
            os.remove(temp_file_path)

            if not success:
                raise HTTPException(status_code=500, detail=message)

            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "Dataset berhasil diupload dan diproses",
                    "processed_file": "data_emisi_gabungan.xlsx"
                },
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                    "Content-Type": "application/json"
                }
            )

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
