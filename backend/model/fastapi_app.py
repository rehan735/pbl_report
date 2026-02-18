from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf
import numpy as np
import json
import os
import logging
from typing import List, Optional

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sign Language Prediction Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'landmark_model.h5')
LABELS_PATH = os.path.join(BASE_DIR, 'class_indices.json')
CONFIDENCE_THRESHOLD = 0.85
WINDOW_SIZE = 5

# Global state for temporal smoothing
prediction_history = []
model = None
index_to_label = {}

class LandmarkInput(BaseModel):
    landmarks: List[float] # List of 126 floats (2 hands * 21 points * 3 coordinates)

@app.on_event("startup")
def load_resources():
    global model, index_to_label
    try:
        if os.path.exists(MODEL_PATH):
            model = tf.keras.models.load_model(MODEL_PATH)
            logger.info(f"Model loaded from {MODEL_PATH}")
        else:
            logger.warning(f"Model file not found at {MODEL_PATH}. Prediction will fail until model is trained.")
            
        if os.path.exists(LABELS_PATH):
            with open(LABELS_PATH, 'r') as f:
                class_indices = json.load(f)
            index_to_label = {v: k for k, v in class_indices.items()}
            logger.info("Class indices loaded.")
    except Exception as e:
        logger.error(f"Error loading resources: {e}")

@app.get("/health")
def health():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "labels_loaded": len(index_to_label) > 0
    }

@app.post("/predict")
async def predict(input_data: LandmarkInput):
    global prediction_history
    
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Landmarks should be a list of 126 floats
        landmarks_list = input_data.landmarks
        if len(landmarks_list) != 126:
            # Handle cases where frontend might still be sending 63
            if len(landmarks_list) == 63:
                landmarks_list = landmarks_list + [0.0] * 63
            else:
                raise HTTPException(status_code=400, detail=f"Expected 126 landmarks, got {len(landmarks_list)}")

        landmarks = np.array(landmarks_list).reshape(1, 126)
        
        predictions = model.predict(landmarks, verbose=0)[0]
        idx = np.argmax(predictions)
        confidence = float(predictions[idx])
        label = index_to_label.get(idx, "Unknown")
        
        # Confidence Thresholding
        if confidence < CONFIDENCE_THRESHOLD:
            prediction_result = "Uncertain"
        else:
            prediction_result = label
            
        # Temporal Smoothing (Rolling Window + Majority Voting)
        prediction_history.append(prediction_result)
        if len(prediction_history) > WINDOW_SIZE:
            prediction_history.pop(0)
            
        # Majority voting
        final_prediction = max(set(prediction_history), key=prediction_history.count)
        
        return {
            "prediction": final_prediction,
            "raw_prediction": label,
            "confidence": confidence,
            "uncertain": final_prediction == "Uncertain"
        }
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
