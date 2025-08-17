import os
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import boto3
from dotenv import load_dotenv
from urllib.parse import quote
import webbrowser
import threading

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "eu-north-1")
BUCKET = os.getenv("AWS_BUCKET", "misha-images-2025-08-17")

if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
    raise RuntimeError("AWS credentials not set in .env file")

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

files_db = []

def load_files_from_s3():
    try:
        response = s3.list_objects_v2(Bucket=BUCKET)
        objects = response.get("Contents", [])
        for obj in objects:
            filename = obj["Key"]
            url = f"https://{BUCKET}.s3.{AWS_REGION}.amazonaws.com/{quote(filename, safe='')}"
            files_db.append({"filename": filename, "url": url})
    except Exception as e:
        print(f"Error loading files from S3: {e}")

load_files_from_s3()

@app.post("/upload")
async def upload_file(file: UploadFile):
    try:
        s3.upload_fileobj(file.file, BUCKET, file.filename, ExtraArgs={"ContentType": file.content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 upload error: {e}")
    url = f"https://{BUCKET}.s3.{AWS_REGION}.amazonaws.com/{quote(file.filename, safe='')}"
    files_db.append({"filename": file.filename, "url": url})
    return {"url": url}

@app.get("/files", response_model=List[dict])
async def list_files():
    return files_db

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    global files_db
    file_entry = next((f for f in files_db if f["filename"] == filename), None)
    if not file_entry:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        s3.delete_object(Bucket=BUCKET, Key=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 deletion error: {e}")
    files_db = [f for f in files_db if f["filename"] != filename]
    return {"detail": f"File '{filename}' deleted successfully"}

app.mount("/static", StaticFiles(directory="front"), name="static")

@app.get("/")
def serve_index():
    return FileResponse("front/index.html")

def open_browser():
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    threading.Timer(1.0, open_browser).start()
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
