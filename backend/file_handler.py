"""File handling utilities for uploading and processing files."""

import os
import base64
import mimetypes
from pathlib import Path
from typing import Optional, Dict, Any, List
import uuid

# Supported file types
TEXT_EXTENSIONS = {'.txt', '.md', '.csv', '.json', '.py', '.js', '.ts', '.log', '.xml', '.yaml', '.yml', '.html', '.css'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit

# Upload directory
UPLOAD_DIR = Path(__file__).parent.parent / "data" / "uploads"


def ensure_upload_dir():
    """Ensure the upload directory exists."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_file_path(file_id: str) -> Path:
    """Get the path for an uploaded file."""
    return UPLOAD_DIR / file_id


def save_uploaded_file(content: bytes, original_filename: str) -> Dict[str, Any]:
    """
    Save an uploaded file and return metadata.
    
    Returns:
        Dict with file_id, original_name, mime_type, size, file_type ('text' or 'image')
    """
    ensure_upload_dir()
    
    # Generate unique ID
    ext = Path(original_filename).suffix.lower()
    file_id = f"{uuid.uuid4()}{ext}"
    file_path = get_file_path(file_id)
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB")
    
    # Determine file type
    if ext in TEXT_EXTENSIONS:
        file_type = "text"
    elif ext in IMAGE_EXTENSIONS:
        file_type = "image"
    else:
        raise ValueError(f"Unsupported file type: {ext}. Supported: {TEXT_EXTENSIONS | IMAGE_EXTENSIONS}")
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Get mime type
    mime_type, _ = mimetypes.guess_type(original_filename)
    
    return {
        "file_id": file_id,
        "original_name": original_filename,
        "mime_type": mime_type or "application/octet-stream",
        "size": len(content),
        "file_type": file_type
    }


def extract_text_content(file_id: str) -> Optional[str]:
    """
    Extract text content from a file.
    
    Returns:
        String content or None if not a text file
    """
    file_path = get_file_path(file_id)
    if not file_path.exists():
        return None
    
    ext = file_path.suffix.lower()
    if ext not in TEXT_EXTENSIONS:
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading file {file_id}: {e}")
        return None


def encode_image_base64(file_id: str) -> Optional[Dict[str, str]]:
    """
    Encode an image file to base64 for vision models.
    
    Returns:
        Dict with 'data' (base64 string) and 'mime_type', or None if not an image
    """
    file_path = get_file_path(file_id)
    if not file_path.exists():
        return None
    
    ext = file_path.suffix.lower()
    if ext not in IMAGE_EXTENSIONS:
        return None
    
    mime_type, _ = mimetypes.guess_type(str(file_path))
    
    try:
        with open(file_path, 'rb') as f:
            data = base64.standard_b64encode(f.read()).decode('utf-8')
        return {
            "data": data,
            "mime_type": mime_type or "image/png"
        }
    except Exception as e:
        print(f"Error encoding image {file_id}: {e}")
        return None


def get_file_info(file_id: str) -> Optional[Dict[str, Any]]:
    """Get information about an uploaded file."""
    file_path = get_file_path(file_id)
    if not file_path.exists():
        return None
    
    ext = file_path.suffix.lower()
    mime_type, _ = mimetypes.guess_type(str(file_path))
    
    if ext in TEXT_EXTENSIONS:
        file_type = "text"
    elif ext in IMAGE_EXTENSIONS:
        file_type = "image"
    else:
        file_type = "unknown"
    
    return {
        "file_id": file_id,
        "file_type": file_type,
        "mime_type": mime_type,
        "size": file_path.stat().st_size,
        "original_name": file_id.split('-', 4)[-1] if '-' in file_id else file_id
    }


def format_files_for_prompt(file_ids: List[str]) -> str:
    """
    Format uploaded files as text context for the LLM prompt.
    
    Args:
        file_ids: List of file IDs to include
        
    Returns:
        Formatted string with file contents
    """
    if not file_ids:
        return ""
    
    parts = []
    for file_id in file_ids:
        info = get_file_info(file_id)
        if not info:
            continue
        
        if info["file_type"] == "text":
            content = extract_text_content(file_id)
            if content:
                # Truncate very long files
                if len(content) > 50000:
                    content = content[:50000] + "\n\n[... content truncated ...]"
                parts.append(f"--- File: {info.get('original_name', file_id)} ---\n{content}\n--- End of file ---")
        elif info["file_type"] == "image":
            parts.append(f"[Image attached: {info.get('original_name', file_id)}]")
    
    if not parts:
        return ""
    
    return "\n\n".join(parts)


def get_images_for_vision(file_ids: List[str]) -> List[Dict[str, str]]:
    """
    Get base64-encoded images for vision model messages.
    
    Returns:
        List of dicts with 'data' and 'mime_type' for each image
    """
    images = []
    for file_id in file_ids:
        encoded = encode_image_base64(file_id)
        if encoded:
            images.append(encoded)
    return images


def cleanup_old_uploads(max_age_hours: int = 24):
    """
    Delete uploaded files older than max_age_hours.
    Called periodically to prevent disk space issues.
    """
    import time
    
    if not UPLOAD_DIR.exists():
        return
    
    cutoff_time = time.time() - (max_age_hours * 3600)
    
    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file() and file_path.stat().st_mtime < cutoff_time:
            try:
                file_path.unlink()
            except Exception as e:
                print(f"Error deleting old upload {file_path}: {e}")
