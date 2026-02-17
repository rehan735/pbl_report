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

        # Preprocessing: Handle colored camera input with varied backgrounds
        # Goal: Isolate hand and normalize background to match grayscale training data
        
        # Step 1: Skin color detection to isolate hand from colored background
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Define skin color range in HSV (works for various skin tones)
        # Lower bound: low saturation, medium hue
        lower_skin1 = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin1 = np.array([20, 255, 255], dtype=np.uint8)
        # Upper bound: higher hue range
        lower_skin2 = np.array([170, 20, 70], dtype=np.uint8)
        upper_skin2 = np.array([180, 255, 255], dtype=np.uint8)
        
        # Create mask for skin-colored regions
        mask1 = cv2.inRange(hsv, lower_skin1, upper_skin1)
        mask2 = cv2.inRange(hsv, lower_skin2, upper_skin2)
        skin_mask = cv2.bitwise_or(mask1, mask2)
        
        # Clean up mask: remove noise and fill holes
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel, iterations=2)
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        skin_mask = cv2.dilate(skin_mask, kernel, iterations=1)
        
        # Step 2: Create normalized image with white background
        # Convert original to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Check if we detected enough hand area (at least 5% of image)
        mask_area = np.sum(skin_mask > 0) / (img.shape[0] * img.shape[1])
        
        if mask_area < 0.05:
            # Skin detection failed or hand too small - use fallback
            # Assume hand is in center region and use adaptive thresholding as fallback
            logger.warning(f"Skin detection found only {mask_area*100:.1f}% of image, using fallback")
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            # Use Otsu's thresholding for better results
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            # Invert so hand is dark on white background
            normalized = cv2.bitwise_not(thresh)
        else:
            # Create normalized image: hand pixels stay as grayscale, background becomes white (255)
            normalized = np.where(skin_mask > 0, gray, 255).astype(np.uint8)
            
            # Optional enhancement: if hand region is very dark, ensure good contrast
            hand_region = np.where(skin_mask > 0)
            if len(hand_region[0]) > 0:
                hand_mean = gray[hand_region].mean()
                # If hand is very light (might be washed out), darken it slightly
                if hand_mean > 200:
                    # Hand is too light, darken it for better contrast
                    normalized = np.where(skin_mask > 0, 
                                        np.clip(gray.astype(np.int16) - 30, 0, 255).astype(np.uint8),
                                        255).astype(np.uint8)
        
        # Step 3: Match training pipeline exactly (grayscale → resize → normalize)
        # Training uses: grayscale image, resize to IMG_SIZE, rescale by 1/255
        final_img = cv2.resize(normalized, (IMG_SIZE, IMG_SIZE))
        final_img = final_img / 255.0
        final_img = final_img.reshape(1, IMG_SIZE, IMG_SIZE, 1)
        
        # Optional debug: save intermediate frames for inspection
        try:
            cv2.imwrite(os.path.join(BASE_DIR, 'debug_input.jpg'), img)
            cv2.imwrite(os.path.join(BASE_DIR, 'debug_gray.jpg'), gray)
            cv2.imwrite(os.path.join(BASE_DIR, 'debug_mask.jpg'), skin_mask)
            cv2.imwrite(os.path.join(BASE_DIR, 'debug_normalized.jpg'), normalized)
        except Exception as debug_err:
            logger.warning(f"Failed to write debug images: {debug_err}")
        
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
