from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
from datetime import datetime
import asyncio

from database import SessionLocal, engine
from models import Base, Image

# Buat tabel di MySQL jika belum ada
Base.metadata.create_all(bind=engine)

app = FastAPI()

IMAGE_DIR = "images"

os.makedirs(IMAGE_DIR, exist_ok=True)

app.mount("/images", StaticFiles(directory=IMAGE_DIR), name="images")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Kamu bisa membatasi dengan URL frontend jika perlu
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def remove_file_async(path: str):
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, os.remove, path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "bmp"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.post("/upload/")
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")

    file_location = os.path.join(IMAGE_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to database...

    # Simpan informasi file ke database
    image = Image(
        filename=file.filename,
        filepath=file_location,
        uploaded_at=datetime.utcnow()
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return {"message": "File uploaded and saved to database", "id": image.id}

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