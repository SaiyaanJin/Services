import os
import shutil
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Depends, status
from fastapi.responses import FileResponse
from starlette.background import BackgroundTasks
from app.config import settings
from app.middleware.auth import get_current_user
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'log', 'csv', 'json', 'xml', 'md'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_folder_segment(segment: str) -> str:
    """Sanitize the combined filename segment to prevent path traversal"""
    # Replace dangerous patterns
    clean = segment.replace(" ", "_").replace(")", "").replace("(", "").replace("&", "")
    return secure_filename(clean)

def cleanup_file(path: str):
    """Callback to delete temporary zip files after download completes"""
    try:
        if os.path.exists(path):
            os.remove(path)
            logger.info(f"Cleaned up temporary download file: {path}")
    except Exception as e:
        logger.error(f"Error cleaning up temporary file {path}: {e}")

@router.post("/upload")
def upload_files(
    demo: list[UploadFile] = File(..., alias="demo[]"),
    current_user: dict = Depends(get_current_user)
):
    """
    Secure file upload endpoint.
    Validates file sizes, extensions, and saves them in structured folders.
    """
    if not demo:
        raise HTTPException(status_code=400, detail="No files provided")

    # Construct the folder segment by concatenating sanitized filenames (legacy behavior compatibility)
    concat_name = ""
    for item in demo:
        if not item.filename:
            continue
        if not allowed_file(item.filename):
            raise HTTPException(
                status_code=400,
                detail=f"File extension not allowed for file: {item.filename}"
            )
        
        # Check size (FastAPI spool file size check)
        item.file.seek(0, 2)
        file_size = item.file.tell()
        item.file.seek(0)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size (10MB): {item.filename}"
            )

        name = item.filename.replace(" ", "_").replace(")", "").replace("(", "")
        concat_name += name

    # Sanitize the final folder segment
    folder_segment = secure_filename(concat_name)
    if not folder_segment:
        raise HTTPException(status_code=400, detail="Invalid filename combination")

    # Destination directory path
    dest_dir = os.path.join(settings.UPLOAD_BASE_PATH, folder_segment)
    
    # Path traversal safety check
    abs_dest_dir = os.path.abspath(dest_dir)
    abs_base_path = os.path.abspath(settings.UPLOAD_BASE_PATH)
    if not abs_dest_dir.startswith(abs_base_path):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path construction")

    os.makedirs(abs_dest_dir, exist_ok=True)

    for item in demo:
        if not item.filename:
            continue
        filename = secure_filename(item.filename)
        file_path = os.path.join(abs_dest_dir, filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(item.file, buffer)
        except Exception as e:
            logger.error(f"Failed to save uploaded file {filename}: {e}")
            raise HTTPException(status_code=500, detail="Failed to save uploaded files")

    return "Done"

@router.get("/download")
def download_files(
    path: str = Query(..., description="Comma-separated filenames"),
    File_Name: str = Query(..., description="Target zip filename"),
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Secure file zipping and downloading.
    Prevents path traversal, uses unique temporary zip files, and cleans up afterward.
    """
    file_list = path.split('|') if '|' in path else path.split(',')
    concat_name = ""
    for file1 in file_list:
        name = file1.replace(" ", "_").replace(")", "").replace("(", "")
        concat_name += name

    folder_segment = secure_filename(concat_name)
    folder_path = os.path.join(settings.UPLOAD_BASE_PATH, folder_segment)
    
    # Path traversal validation
    abs_folder_path = os.path.abspath(folder_path)
    abs_base_path = os.path.abspath(settings.UPLOAD_BASE_PATH)
    if not abs_folder_path.startswith(abs_base_path) or not os.path.exists(abs_folder_path):
        raise HTTPException(status_code=404, detail="Requested file batch not found")

    # Verify that requested files exist inside the directory
    dir_list = os.listdir(abs_folder_path)
    for file in file_list:
        file_clean = secure_filename(file.replace(" ", "_").replace(")", "").replace("(", "").replace("&", ""))
        if file_clean not in dir_list:
            raise HTTPException(status_code=404, detail=f"File {file} has been removed or does not exist")

    # Create a unique zip file path to avoid race conditions
    zip_id = str(uuid.uuid4())
    os.makedirs(settings.ZIP_TEMP_PATH, exist_ok=True)
    temp_zip_base = os.path.join(settings.ZIP_TEMP_PATH, f"download_{zip_id}")
    
    try:
        # Create the zip archive
        archived_path = shutil.make_archive(temp_zip_base, 'zip', abs_folder_path)
        
        # Enforce sanitization of the download header file name
        safe_download_name = secure_filename(File_Name) + ".zip"
        
        # Register deletion task to run after the file response is sent
        if background_tasks:
            background_tasks.add_task(cleanup_file, archived_path)
            
        return FileResponse(
            path=archived_path,
            filename=safe_download_name,
            media_type="application/zip"
        )
    except Exception as e:
        logger.error(f"Error archiving files for download: {e}")
        # Cleanup if archive failed
        archive_file = temp_zip_base + ".zip"
        if os.path.exists(archive_file):
            os.remove(archive_file)
        raise HTTPException(status_code=500, detail="Error generating download archive")


@router.get("/preview")
def preview_file(
    filename: str = Query(..., description="Filename to preview"),
    current_user: dict = Depends(get_current_user)
):
    """
    Serves a single attachment file inline for browser preview.
    Supports images, PDFs, and text files.
    """
    import mimetypes
    
    safe_name = secure_filename(filename.replace(" ", "_").replace(")", "").replace("(", "").replace("&", ""))
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Search in all subdirectories of UPLOAD_BASE_PATH
    abs_base = os.path.abspath(settings.UPLOAD_BASE_PATH)
    found_path = None
    
    for root, dirs, files in os.walk(abs_base):
        if safe_name in files:
            candidate = os.path.abspath(os.path.join(root, safe_name))
            if candidate.startswith(abs_base):
                found_path = candidate
                break

    if not found_path or not os.path.exists(found_path):
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    mime_type, _ = mimetypes.guess_type(found_path)
    if not mime_type:
        mime_type = "application/octet-stream"

    return FileResponse(
        path=found_path,
        media_type=mime_type,
        headers={"Content-Disposition": f"inline; filename=\"{safe_name}\""}
    )

