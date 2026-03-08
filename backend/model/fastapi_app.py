from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf
import numpy as np
import json
import os
import logging
from typing import List
from preprocess import preprocess_sequence

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sign Language Sequence Prediction Service v2")

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
MODEL_PATH = os.path.join(BASE_DIR, 'word_lstm_model.keras')
LABELS_PATH = os.path.join(BASE_DIR, 'word_classes_indices.json')
CONFIDENCE_THRESHOLD = 0.60 # Lowered for real-world detection
SEQUENCE_LENGTH = 30
FEATURES = 126
WINDOW_SIZE = 2 

# Global state for temporal smoothing
prediction_history = []
model = None
index_to_label = {}

class SequenceInput(BaseModel):
    # Expect a list of 30 frames, where each frame is a list of 126 float landmarks
    frames: List[List[float]] 

@app.on_event("startup")
def load_resources():
    global model, index_to_label
    try:
        logger.info("Initializing TensorFlow and loading models...")
        if os.path.exists(MODEL_PATH):
            model = tf.keras.models.load_model(MODEL_PATH)
            logger.info(f"LSTM Sequence Model loaded from {MODEL_PATH}")
        else:
            logger.warning(f"Model file not found at {MODEL_PATH}. Prediction will fail.")
            
        if os.path.exists(LABELS_PATH):
            with open(LABELS_PATH, 'r') as f:
                class_indices = json.load(f)
            # JSON keys are often strings, convert to int for mapping
            index_to_label = {int(k): v for k, v in class_indices.items()}
            logger.info(f"Class indices loaded. Found {len(index_to_label)} classes.")
        
        logger.info("Sign Language Prediction Service is READY at http://0.0.0.0:5001")
    except Exception as e:
        logger.error(f"Error loading resources: {e}")

@app.get("/health")
def health():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "labels_loaded": len(index_to_label) > 0,
        "classes": index_to_label
    }

@app.post("/predict")
async def predict(input_data: SequenceInput):
    global prediction_history
    
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        frames = input_data.frames
        if len(frames) != SEQUENCE_LENGTH:
            raise HTTPException(status_code=400, detail=f"Expected sequence of {SEQUENCE_LENGTH} frames, got {len(frames)}")
            
        # Validate each frame has 126 features
        for frame in frames:
            if len(frame) != 126:
                raise HTTPException(status_code=400, detail=f"Each frame must have 126 landmarks.")

        # Convert to numpy array of shape (30, 126)
        raw_sequence = np.array(frames)
        
        # Preprocess to (30, 126) -> Wrist normalization ONLY (No velocity for Word LSTM)
        processed_sequence = preprocess_sequence(raw_sequence, use_velocity=False)
        
        # Reshape for LSTM model input: (1, 30, 126)
        model_input = processed_sequence.reshape(1, SEQUENCE_LENGTH, FEATURES)
        
        predictions = model.predict(model_input, verbose=0)[0]
        idx = int(np.argmax(predictions))
        confidence = float(predictions[idx])
        label = index_to_label.get(idx, "Unknown")
        
        # Confidence Thresholding
        if confidence < CONFIDENCE_THRESHOLD:
            prediction_result = "Uncertain"
        else:
            prediction_result = label
            
        # Temporal Smoothing over recent sequence predictions
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
