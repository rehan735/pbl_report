from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
import numpy as np
import cv2
import os
import json
import logging

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Constants
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model.h5')
INDICES_PATH = os.path.join(BASE_DIR, 'class_indices.json')
IMG_SIZE = 64

# Load Model (Global)
logger.info("Loading model...")
try:
    model = load_model(MODEL_PATH)
    with open(INDICES_PATH) as f:
        class_indices = json.load(f)
    index_to_label = {v: k for k, v in class_indices.items()}
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    raise e

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'running', 'model_loaded': model is not None})

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    try:
        # Read image to numpy array
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if img is None:
             return jsonify({'error': 'Failed to decode image'}), 400

        # --- ADAPTIVE THRESHOLDING (Lighting Robust) ---
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Blur to reduce noise
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Adaptive Threshold
        # Block Size: 11, Constant: 2
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                     cv2.THRESH_BINARY, 11, 2)
                                     
        # Result: Background usually White (255), Edges/Darker areas Black (0)
        # We need "Black Hand, White Background".
        # Check if we need to invert.
        # Simple heuristic: If borders are black, invert?
        # But usually Adaptive works locally.
        
        # Let's save a debug image to check what's happening
        cv2.imwrite(os.path.join(BASE_DIR, 'debug_input.jpg'), img)
        cv2.imwrite(os.path.join(BASE_DIR, 'debug_thresh.jpg'), thresh)
        
        final_img = thresh
        
        # Optional: Morphological operations to remove noise
        kernel = np.ones((3,3), np.uint8)
        final_img = cv2.morphologyEx(final_img, cv2.MORPH_OPEN, kernel)

        # Resize and Normalize
        final_img = cv2.resize(final_img, (IMG_SIZE, IMG_SIZE))
        final_img = final_img / 255.0
        final_img = final_img.reshape(1, IMG_SIZE, IMG_SIZE, 1)
        
        # Predict
        pred = model.predict(final_img, verbose=0)[0]
        idx = int(np.argmax(pred))
        confidence = float(pred[idx])
        label = index_to_label[idx]
        
        logger.info(f"Prediction: {label} ({confidence:.4f})")
        return jsonify({'prediction': label, 'confidence': confidence})
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run on port 5001 to avoid conflict with Node (5000)
    app.run(host='0.0.0.0', port=5001)
