from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from datetime import datetime
import aiohttp
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime
from database import SessionLocal, engine
from models import Base, Image

# Initialize FastAPI app
app = FastAPI()

# Set up image directory
IMAGE_DIR = "images"
os.makedirs(IMAGE_DIR, exist_ok=True)

# CORS settings to allow frontend requests from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure that the tables are created only once (typically when the app first runs)
Base.metadata.create_all(bind=engine)  # Only run once, and don't include extend_existing=True here

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper function to check allowed file types
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "bmp"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# File upload function (POST method)
@app.post("/upload/")
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")

    try:
        # Menyimpan file yang diunggah
        file_location = os.path.join(IMAGE_DIR, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Menyimpan metadata gambar ke database
        image = Image(
            filename=file.filename,
            filepath=file_location,
            uploaded_at=datetime.utcnow()
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        # Memanggil API OCR dan mendapatkan teks dari gambar
        ocr_result = await call_ocr_api(file_location)

        # Pastikan data yang dikirim ke frontend memiliki struktur yang benar
        return JSONResponse(content={
            "message": "File uploaded successfully",
            "id": image.id,  # Pastikan ID valid dikirim
            "ocr_result": ocr_result  # Pastikan hasil OCR ada
        })

    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"File upload failed: {str(e)}"})


# Helper function to call the OCR API
async def call_ocr_api(image_path: str):
    ocr_api_url = "http://127.0.0.1:9000/ocr/"  # OCR API berada di port 9000
    try:
        # Baca gambar dan kirim ke API OCR
        with open(image_path, "rb") as img_file:
            image_data = img_file.read()

        # Kirim file sebagai multipart/form-data
        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            form_data.add_field('file', image_data, filename='image.png', content_type='image/png')

            async with session.post(ocr_api_url, data=form_data) as response:
                print(f"Status OCR API response: {response.status}")  # Log status respons dari API OCR
                if response.status == 200:
                    result = await response.json()
                    return result["result"]
                else:
                    raise HTTPException(status_code=500, detail="OCR API error")

    except Exception as e:
        # Log error di console backend untuk debugging
        print(f"Error during OCR processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")



# Image model for saving file info in the database
class Image(Base):
    __tablename__ = "images"
    __table_args__ = {'extend_existing': True}  # Ensure the table is redefined if needed

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

# GET method to fetch all images (optional)
@app.get("/", response_class=HTMLResponse)
async def read_root(db: Session = Depends(get_db)):
    images = db.query(Image).order_by(Image.uploaded_at.desc()).all()

    if not images:
        return "<h2>Belum ada gambar yang diupload.</h2>"

    html = "<h2>Gambar-gambar yang telah diupload:</h2>"
    for img in images:
        filename = os.path.basename(img.filepath)
        html += f'<div><img src="/images/{filename}" width="300"><p>{filename}</p></div>'
    return html

# DELETE method to delete an image by filename
@app.delete("/delete/{filename}")
async def delete_image(filename: str, db: Session = Depends(get_db)):
    image = db.query(Image).filter(Image.filename == filename).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if os.path.isfile(image.filepath):
        await remove_file_async(image.filepath)

    db.delete(image)
    db.commit()

    return {"message": f"Image {filename} deleted successfully"}

# Async helper function for deleting a file
async def remove_file_async(path: str):
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, os.remove, path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
