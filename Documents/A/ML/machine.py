from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import easyocr
import numpy as np
from PIL import Image
import io

app = FastAPI()
reader = easyocr.Reader(['id'], gpu=False)

@app.post("/ocr/")
async def ocr_from_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)
        
        results = reader.readtext(image_np)
        texts = [text for (_, text, _) in results]

        return JSONResponse(content={"result": texts})
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
