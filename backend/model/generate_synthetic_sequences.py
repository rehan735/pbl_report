import os
from typing import Optional
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
DATASET_PATH        = r'c:\PROJECTS\project\backend\dataset\archive (5)\Indian'
HAND_LANDMARKER_MODEL = r'c:\PROJECTS\project\backend\model\hand_landmarker.task'
SEQUENCE_LENGTH     = 30
AUGMENTATION_COUNT  = 5   # synthetic sequences per source image

# FIX: Use absolute paths so script works from any working directory
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DATA_FILE  = os.path.join(_SCRIPT_DIR, 'synthetic_sequences.npy')
OUTPUT_LABELS_FILE = os.path.join(_SCRIPT_DIR, 'synthetic_labels.npy')
CLASSES_FILE      = os.path.join(_SCRIPT_DIR, 'sequence_classes.json')


def extract_landmarks_from_image(image_path: str, detector) -> Optional[np.ndarray]:
    """Extract 126-float landmark vector from a single image.

    Bug fix: BGR->RGB conversion added (OpenCV reads BGR, MediaPipe needs RGB).
    """
    try:
        cv_mat = cv2.imread(image_path)
        if cv_mat is None:
            return None

        # FIX: Convert BGR -> RGB
        rgb_mat = cv2.cvtColor(cv_mat, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_mat)
        detection_result = detector.detect(mp_image)

        landmarks_array = np.zeros(126)   # 2 hands × 21 pts × 3 coords

        if detection_result.hand_landmarks:
            for idx, hand_landmarks in enumerate(detection_result.hand_landmarks):
                if idx > 1:
                    break
                offset = idx * 63
                for i, lm in enumerate(hand_landmarks):
                    landmarks_array[offset + (i * 3)]     = lm.x
                    landmarks_array[offset + (i * 3) + 1] = lm.y
                    landmarks_array[offset + (i * 3) + 2] = lm.z

            return landmarks_array

    except Exception as e:
        logger.error(f"Error extracting landmarks from {image_path}: {e}")
    return None


def generate_synthetic_sequence(
    base_landmarks: np.ndarray,
    sequence_length: int = 30
) -> np.ndarray:
    """Create a jitter-augmented sequence from a single static landmark frame."""
    sequence = []
    for _ in range(sequence_length):
        noise = np.random.normal(0, 0.005, size=126)
        noisy = np.where(base_landmarks != 0, base_landmarks + noise, 0)
        sequence.append(noisy)
    return np.array(sequence)


def preprocess_and_augment():
    # ── Guards ────────────────────────────────────────────────────────────────
    if not os.path.exists(HAND_LANDMARKER_MODEL):
        logger.error(f"Hand landmarker model not found: {HAND_LANDMARKER_MODEL}")
        return

    if not os.path.exists(DATASET_PATH):
        logger.error(f"Dataset path not found: {DATASET_PATH}")
        return

    # FIX: Create detector INSIDE function - not at module level
    base_options = python.BaseOptions(model_asset_path=HAND_LANDMARKER_MODEL)
    options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=2)
    detector = vision.HandLandmarker.create_from_options(options)

    X, y = [], []
    class_map = {}
    class_idx = 0

    classes = sorted(os.listdir(DATASET_PATH))

    for class_folder in classes:
        class_path = os.path.join(DATASET_PATH, class_folder)
        if not os.path.isdir(class_path):
            continue

        class_map[class_folder] = class_idx
        logger.info(f"Processing class: '{class_folder}' ...")

        image_files = [
            f for f in os.listdir(class_path)
            if f.lower().endswith(('.jpg', '.jpeg', '.png'))
        ]

        # Limit to 50 images per class for speed
        for img_name in image_files[:50]:
            img_path = os.path.join(class_path, img_name)
            base_landmarks = extract_landmarks_from_image(img_path, detector)

            if base_landmarks is not None and not np.all(base_landmarks == 0):
                for _ in range(AUGMENTATION_COUNT):
                    seq = generate_synthetic_sequence(base_landmarks, SEQUENCE_LENGTH)
                    X.append(seq)
                    y.append(class_idx)

        class_idx += 1

    if not X:
        logger.error("No valid landmarks extracted! Check dataset and MediaPipe model.")
        return

    X_arr = np.array(X)
    y_arr = np.array(y)

    logger.info(f"Generated {len(X_arr)} sequences of shape {X_arr.shape}")

    np.save(OUTPUT_DATA_FILE, X_arr)
    np.save(OUTPUT_LABELS_FILE, y_arr)

    with open(CLASSES_FILE, 'w') as f:
        json.dump(class_map, f, indent=2)

    logger.info(f"Saved to:\n  {OUTPUT_DATA_FILE}\n  {OUTPUT_LABELS_FILE}\n  {CLASSES_FILE}")


if __name__ == "__main__":
    preprocess_and_augment()
