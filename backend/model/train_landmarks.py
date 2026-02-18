import os
import cv2
import mediapipe as mp
import numpy as np
import json
import logging
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DATASET_PATH = r'c:\PROJECTS\project\backend\dataset\archive\ISL_Dataset'
MODEL_SAVE_PATH = r'c:\PROJECTS\project\backend\model\landmark_model.h5'
LABELS_SAVE_PATH = r'c:\PROJECTS\project\backend\model\class_indices.json'
HAND_LANDMARKER_MODEL = r'c:\PROJECTS\project\backend\model\hand_landmarker.task'

# Global detector instance - Supporting up to 2 hands
base_options = python.BaseOptions(model_asset_path=HAND_LANDMARKER_MODEL)
options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=2)
detector = vision.HandLandmarker.create_from_options(options)

def extract_landmarks(image_path):
    try:
        cv_mat = cv2.imread(image_path)
        if cv_mat is None: return None
        
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv_mat)
        detection_result = detector.detect(mp_image)
        
        # We want 126 floats (2 hands * 21 points * 3 coordinates)
        # We'll order them: Hand 0, Hand 1. If a hand is missing, we fill with 0s.
        combined_landmarks = np.zeros(126).tolist()
        
        if detection_result.hand_landmarks:
            for i, hand_landmarks in enumerate(detection_result.hand_landmarks):
                if i >= 2: break # Only take first 2 hands
                
                start_idx = i * 63
                temp_lms = []
                for lm in hand_landmarks:
                    temp_lms.extend([lm.x, lm.y, lm.z])
                
                # Normalize individual hand relative to its wrist
                base_x, base_y, base_z = temp_lms[0], temp_lms[1], temp_lms[2]
                for j in range(0, 63, 3):
                    combined_landmarks[start_idx + j] = temp_lms[j] - base_x
                    combined_landmarks[start_idx + j + 1] = temp_lms[j+1] - base_y
                    combined_landmarks[start_idx + j + 2] = temp_lms[j+2] - base_z
            
            return combined_landmarks
    except Exception as e:
        logger.error(f"Error processing {image_path}: {e}")
    return None

def train():
    if not os.path.exists(HAND_LANDMARKER_MODEL):
        logger.error(f"Hand landmarker model not found at {HAND_LANDMARKER_MODEL}")
        return

    data = []
    labels = []
    classes = sorted(os.listdir(DATASET_PATH))
    class_indices = {cls: i for i, cls in enumerate(classes)}
    
    logger.info(f"Extracting landmarks for {len(classes)} classes (Two-Hand Mode)...")
    
    for cls in classes:
        cls_path = os.path.join(DATASET_PATH, cls)
        if not os.path.isdir(cls_path): continue
        
        count = 0
        for img_name in os.listdir(cls_path):
            img_path = os.path.join(cls_path, img_name)
            landmarks = extract_landmarks(img_path)
            # Accept if at least one hand's worth of data is non-zero (or just any data returned)
            if landmarks and any(v != 0 for v in landmarks):
                data.append(landmarks)
                labels.append(class_indices[cls])
                count += 1
        logger.info(f"Class {cls}: {count} samples extracted.")

    if not data:
        logger.error("No landmarks were extracted! System cannot train.")
        return

    X = np.array(data)
    y = np.array(labels)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Updated hidden layers for more complex 126-dim input
    model = Sequential([
        Dense(256, activation='relu', input_shape=(126,)),
        BatchNormalization(),
        Dropout(0.3),
        Dense(128, activation='relu'),
        BatchNormalization(),
        Dropout(0.2),
        Dense(64, activation='relu'),
        Dense(len(classes), activation='softmax')
    ])
    
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    early_stop = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)
    
    logger.info(f"Training on {len(X_train)} samples with 126 features...")
    model.fit(X_train, y_train, epochs=200, batch_size=32, validation_data=(X_test, y_test), callbacks=[early_stop])
    
    model.save(MODEL_SAVE_PATH)
    with open(LABELS_SAVE_PATH, 'w') as f:
        json.dump(class_indices, f)
        
    logger.info(f"Training complete. Model saved to {MODEL_SAVE_PATH}")

if __name__ == "__main__":
    train()
