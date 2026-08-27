import os
import uuid
import base64
import io
import traceback
from typing import Dict, Any

import numpy as np
import tensorflow as tf
from tensorflow import keras
from fastapi import UploadFile, HTTPException
from PIL import Image

# Paths
CURRENT_DIR = os.path.abspath(os.path.dirname(__file__))
MODEL_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "models", "mri", "best_parkinsons_mri.keras"))
UPLOADS_MRI_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "uploads", "mri"))
os.makedirs(UPLOADS_MRI_DIR, exist_ok=True)

# Load model once (singleton)
try:
    _mri_model = tf.keras.models.load_model(MODEL_PATH, compile=False)
except Exception as e:
    _mri_model = None
    print(f"[MRI Service] Model loading failed: {e}")

# Load class mapping
import json
CLASS_MAPPING_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "mri_class_mapping.json"))
if not os.path.exists(CLASS_MAPPING_PATH):
    CLASS_MAPPING_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "models", "mri", "mri_class_mapping.json"))
try:
    with open(CLASS_MAPPING_PATH, "r", encoding="utf-8") as f:
        _class_mapping = json.load(f)
    print(f"[MRI Service] Class mapping loaded: {_class_mapping}")
except Exception as e:
    _class_mapping = {"0": "Healthy", "1": "Parkinson"}
    print(f"[MRI Service] Class mapping load failed: {e}")

def _preprocess_image(image_path: str) -> tf.Tensor:
    """Load image, convert to RGB, resize to 224x224, convert to float32 (raw [0, 255] pixel scale) and add batch dim."""
    img = Image.open(image_path).convert("RGB")
    img = img.resize((224, 224))
    img_array = tf.convert_to_tensor(np.array(img), dtype=tf.float32)
    img_batch = tf.expand_dims(img_array, axis=0)  # shape (1,224,224,3)
    return img_batch

def _predict(image_path: str) -> Dict[str, Any]:
    if _mri_model is None:
        raise RuntimeError("MRI model is not loaded.")
    # Preprocess
    img_tensor = _preprocess_image(image_path)
    # Predict probabilities
    probs = _mri_model(img_tensor, training=False).numpy()[0]
    pred_idx = int(tf.argmax(probs).numpy())
    raw_label = _class_mapping.get(str(pred_idx), "Unknown")
    pred_label = "Parkinson" if "parkinson" in raw_label.lower() else "Healthy"
    confidence = round(float(probs[pred_idx]) * 100, 2)
    
    # Build probability dict with clean class names
    prob_dict = {}
    for i, p in enumerate(probs):
        raw_k = _class_mapping.get(str(i), f"Class_{i}")
        clean_k = "Parkinson" if "parkinson" in raw_k.lower() else "Healthy"
        prob_dict[clean_k] = round(float(p) * 100, 2)
        
    return {
        "prediction": pred_label,
        "confidence": confidence,
        "probabilities": prob_dict,
        "class_index": pred_idx,
        "input_tensor": img_tensor
    }

# Grad‑CAM utility is imported lazily to avoid circular imports
def _generate_gradcam(image_path: str, class_idx: int) -> str:
    from backend.xai.mri_gradcam import GradCam
    try:
        heatmap_b64 = GradCam.generate_heatmap(_mri_model, image_path, class_idx)
        return heatmap_b64
    except Exception as e:
        raise RuntimeError(f"Grad‑CAM generation failed: {e}")

class MriService:
    @staticmethod
    async def predict(file: UploadFile, user_id: int) -> Dict[str, Any]:
        # Validate extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".png", ".jpg", ".jpeg"]:
            raise HTTPException(status_code=400, detail="Unsupported image format. Use PNG or JPG.")
        # Save temporarily
        saved_name = f"mri_{user_id}_{uuid.uuid4()}{ext}"
        saved_path = os.path.join(UPLOADS_MRI_DIR, saved_name)
        try:
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            with open(saved_path, "wb") as f:
                f.write(content)
            # Run prediction
            pred_res = _predict(saved_path)
            heatmap_b64 = _generate_gradcam(saved_path, pred_res["class_index"])
            # Clean up file after prediction (optional keep for history)
            # os.remove(saved_path)
            result = {
                "modality": "MRI",
                "prediction": pred_res["prediction"],
                "confidence": pred_res["confidence"],
                "probabilities": pred_res["probabilities"],
                "explanation": {
                    "method": "Grad-CAM",
                    "heatmap": heatmap_b64,
                    "summary": "The highlighted regions show areas of the MRI image that contributed more strongly to the model's prediction."
                },
                "mri_filename": saved_name
            }
            return result
        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"MRI prediction error: {str(e)}")
