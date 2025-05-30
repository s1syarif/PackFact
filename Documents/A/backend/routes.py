from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from sqlalchemy.orm import Session
from models import Image
from database import SessionLocal
import os, shutil, asyncio
from datetime import datetime
import aiohttp

router = APIRouter()

IMAGE_DIR = "images"
os.makedirs(IMAGE_DIR, exist_ok=True)

# Dependency database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "bmp"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@router.post("/upload/")
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")

    try:
        file_location = os.path.join(IMAGE_DIR, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image = Image(
            filename=file.filename,
            filepath=file_location,
            uploaded_at=datetime.utcnow()
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        # Panggil fungsi OCR yang juga bisa kamu pisah di modul lain
        ocr_result = await call_ocr_api(file_location)

        return JSONResponse(content={
            "message": "File uploaded successfully",
            "id": image.id,
            "filename": image.filename,  # Pastikan ini ditambahkan
            "ocr_result": ocr_result
        })

    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"File upload failed: {str(e)}"})

@router.get("/", response_class=HTMLResponse)
async def read_root(db: Session = Depends(get_db)):
    images = db.query(Image).order_by(Image.uploaded_at.desc()).all()
    if not images:
        return "<h2>Belum ada gambar yang diupload.</h2>"

    html = "<h2>Gambar-gambar yang telah diupload:</h2>"
    for img in images:
        filename = os.path.basename(img.filepath)
        html += f'<div><img src="/images/{filename}" width="300"><p>{filename}</p></div>'
    return html

@router.delete("/delete/{filename}")
async def delete_image(filename: str, db: Session = Depends(get_db)):
    image = db.query(Image).filter(Image.filename == filename).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if os.path.isfile(image.filepath):
        await remove_file_async(image.filepath)

    db.delete(image)
    db.commit()

    return {"message": f"Image {filename} deleted successfully"}

async def remove_file_async(path: str):
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, os.remove, path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

# Contoh stub call_ocr_api, kamu bisa pindah ke file lain juga
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
