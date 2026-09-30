# pylint: skip-file
# type: ignore
"""
backend/preprocess.py
Standardized, reproducible image preprocessing pipeline for Brain Tumor MRI images.
Used identically across Training, Validation, Testing, and Inference.
Technologies: OpenCV, Pillow, NumPy
"""

import io
import os
import cv2
import numpy as np
from PIL import Image

TARGET_SIZE = (224, 224) # Height, Width
VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 # 15 MB
MIN_DIMENSION = 64

def validate_image_file(file_bytes: bytes, filename: str = "") -> tuple[bool, str]:
    """
    Validates the uploaded file:
    1. Size constraint (< 15MB)
    2. Extension constraint (.png, .jpg, .jpeg, .webp)
    3. File header & byte integrity verification via Pillow
    4. Minimum spatial dimensions (>= 64x64)
    """
    if not file_bytes or len(file_bytes) == 0:
        return False, "Empty file provided."

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        return False, f"File size exceeds limit of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB."

    if filename:
        ext = os.path.splitext(filename)[1].lower()
        if ext and ext not in VALID_EXTENSIONS:
            return False, f"Unsupported file extension '{ext}'. Accepted formats: {', '.join(sorted(VALID_EXTENSIONS))}"

    try:
        stream = io.BytesIO(file_bytes)
        img = Image.open(stream)
        img.verify() # Fast integrity check

        # Re-open stream since verify() alters file pointer
        stream.seek(0)
        img = Image.open(stream)
        w, h = img.size

        if w < MIN_DIMENSION or h < MIN_DIMENSION:
            return False, f"Image dimensions too small ({w}x{h}). Minimum required: {MIN_DIMENSION}x{MIN_DIMENSION}."

        return True, "Valid"
    except Exception as e:
        return False, f"Corrupted or invalid image: {str(e)}"

def load_image(image_input) -> np.ndarray:
    """
    Loads an image from a file path, file-like object, or raw bytes into an RGB NumPy array.
    """
    if isinstance(image_input, (str, os.PathLike)):
        if not os.path.exists(image_input):
            raise FileNotFoundError(f"Image not found at path: {image_input}")
        img = cv2.imread(str(image_input))
        if img is None:
            raise ValueError(f"OpenCV failed to decode image at: {image_input}")
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img_rgb

    elif isinstance(image_input, bytes):
        img_array = np.frombuffer(image_input, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            # Fallback to Pillow
            pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
            return np.array(pil_img)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img_rgb

    elif hasattr(image_input, "read"):
        content = image_input.read()
        return load_image(content)

    elif isinstance(image_input, np.ndarray):
        if len(image_input.shape) == 2:
            return cv2.cvtColor(image_input, cv2.COLOR_GRAY2RGB)
        elif image_input.shape[2] == 4:
            return cv2.cvtColor(image_input, cv2.COLOR_RGBA2RGB)
        return image_input

    raise TypeError(f"Unsupported image input type: {type(image_input)}")

def preprocess_image(image_input, target_size=TARGET_SIZE, expand_batch_dim: bool = True) -> np.ndarray:
    """
    Complete Standardized Preprocessing Pipeline:
    1. Loading into NumPy RGB
    2. Resizing to target dimensions (224x224) via bilinear interpolation
    3. Normalizing pixel values to floating-point [0.0, 1.0]
    4. Adding batch dimension [1, 224, 224, 3] if expand_batch_dim is True

    This function is strictly guaranteed to be identical across:
    - Training
    - Validation
    - Testing
    - Real-time Flask API Prediction
    """
    # 1. Load image as RGB NumPy array
    img_rgb = load_image(image_input)

    # 2. Resize to target dimension
    resized = cv2.resize(img_rgb, target_size, interpolation=cv2.INTER_LINEAR)

    # 3. Pixel normalization to [0.0, 1.0]
    normalized = resized.astype(np.float32) / 255.0

    # 4. Batch dimension creation
    if expand_batch_dim:
        batch_tensor = np.expand_dims(normalized, axis=0)
        return batch_tensor

    return normalized
