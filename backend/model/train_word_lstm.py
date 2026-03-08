import os
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import json
import logging
from typing import Optional
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
#
# Dataset: Indian sign Language - Real-life Words
# Structure:
#   <DATASET_PATH>/<word>/<word>/User_1..User_6/  -> sequential jpg frames
#
DATASET_PATH      = r'c:\PROJECTS\project\backend\dataset\Indian sign Language-Real-life Words\Indian sign Language-Real-life Words\New folder'
HAND_LANDMARKER   = r'c:\PROJECTS\project\backend\model\hand_landmarker.task'
MODEL_SAVE_PATH   = r'c:\PROJECTS\project\backend\model\word_lstm_model.keras'
CLASSES_SAVE_PATH = r'c:\PROJECTS\project\backend\model\word_classes.json'
SEQUENCE_LENGTH   = 30    # frames resampled to this fixed length
NUM_LANDMARKS     = 126   # 2 hands × 21 pts × 3 coords
BATCH_SIZE        = 16
EPOCHS            = 100


def extract_landmarks_from_image(
    image_path: str, detector
) -> Optional[np.ndarray]:
    """Extract 126-float landmark vector from an image.

    FIX: Uses Optional[np.ndarray] instead of np.ndarray | None (Python 3.8+).
    FIX: BGR->RGB conversion added before passing to MediaPipe.
    """
    try:
        cv_mat = cv2.imread(image_path)
        if cv_mat is None:
            return None

        # FIX: Convert BGR -> RGB
        rgb_mat = cv2.cvtColor(cv_mat, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_mat)
        result = detector.detect(mp_image)

        landmarks = np.zeros(NUM_LANDMARKS)

        if result.hand_landmarks:
            for hand_idx, hand in enumerate(result.hand_landmarks[:2]):
                offset = hand_idx * 63
                raw = []
                for lm in hand:
                    raw.extend([lm.x, lm.y, lm.z])
                # Normalise relative to wrist
                bx, by, bz = raw[0], raw[1], raw[2]
                for j in range(0, 63, 3):
                    landmarks[offset + j]     = raw[j]     - bx
                    landmarks[offset + j + 1] = raw[j + 1] - by
                    landmarks[offset + j + 2] = raw[j + 2] - bz

        return landmarks

    except Exception as e:
        logger.error(f"Error extracting {image_path}: {e}")
        return None


def resample_sequence(frames: list, target_len: int) -> np.ndarray:
    """Linearly resample a variable-length list of frames to target_len."""
    arr = np.array(frames, dtype=np.float32)
    n = len(arr)
    if n == target_len:
        return arr
    indices = np.linspace(0, n - 1, target_len)
    return np.array([arr[int(round(i))] for i in indices])


def load_dataset(detector):
    """Walk the word dataset and build (X, y, class_map).

    FIX: detector passed in (not created at module level).
    """
    X, y = [], []
    class_map = {}
    class_idx = 0

    if not os.path.exists(DATASET_PATH):
        logger.error(f"Dataset path not found: {DATASET_PATH}")
        return None, None, None

    words = sorted(os.listdir(DATASET_PATH))

    for word in words:
        # Handle nested structure: word/word/User_N  OR  word/User_N
        word_inner_path = os.path.join(DATASET_PATH, word, word)
        if not os.path.isdir(word_inner_path):
            word_inner_path = os.path.join(DATASET_PATH, word)
            if not os.path.isdir(word_inner_path):
                continue

        class_map[word] = class_idx
        seq_count = 0

        for user_folder in sorted(os.listdir(word_inner_path)):
            user_path = os.path.join(word_inner_path, user_folder)
            if not os.path.isdir(user_path):
                continue

            frame_files = sorted(
                [f for f in os.listdir(user_path)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))],
                key=lambda f: int(''.join(filter(str.isdigit, f)) or '0')
            )

            frames = []
            for fname in frame_files:
                lm = extract_landmarks_from_image(
                    os.path.join(user_path, fname), detector
                )
                if lm is not None:
                    frames.append(lm)

            if len(frames) < 5:
                logger.warning(
                    f"  Skipping {word}/{user_folder}: only {len(frames)} valid frames"
                )
                continue

            seq = resample_sequence(frames, SEQUENCE_LENGTH)
            X.append(seq)
            y.append(class_idx)
            seq_count += 1

        logger.info(f"Class '{word}' (idx {class_idx}): {seq_count} sequences")
        class_idx += 1

    if not X:
        logger.error("No sequences loaded. Check dataset path and structure.")
        return None, None, None

    return np.array(X, dtype=np.float32), np.array(y), class_map


def build_model(num_classes: int, sequence_len: int, features: int) -> Sequential:
    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(sequence_len, features)),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(64, return_sequences=False),
        BatchNormalization(),
        Dropout(0.3),
        Dense(64, activation='relu'),
        Dropout(0.2),
        Dense(num_classes, activation='softmax')
    ])
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


if __name__ == "__main__":
    if not os.path.exists(HAND_LANDMARKER):
        logger.error(f"Hand landmarker model not found: {HAND_LANDMARKER}")
        raise SystemExit(1)

    # FIX: Create detector INSIDE main block, not at module level
    base_options = python.BaseOptions(model_asset_path=HAND_LANDMARKER)
    options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=2)
    detector = vision.HandLandmarker.create_from_options(options)

    logger.info("Loading word-level LSTM dataset...")
    X, y, class_map = load_dataset(detector)

    if X is None:
        raise SystemExit(1)

    num_classes = len(class_map)
    logger.info(
        f"Total: {len(X)} sequences, {num_classes} classes -> {list(class_map.keys())}"
    )

    # FIX: Only use stratify when every class has >= 2 samples
    class_counts = np.bincount(y)
    can_stratify = bool(np.all(class_counts >= 2))
    X_train, X_val, y_train, y_val = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y if can_stratify else None
    )
    if not can_stratify:
        logger.warning("Some classes have <2 samples — stratification disabled.")

    model = build_model(num_classes, SEQUENCE_LENGTH, NUM_LANDMARKS)
    model.summary()

    callbacks = [
        EarlyStopping(monitor='val_loss', patience=20, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=10, min_lr=1e-5)
    ]

    logger.info("Training word-level LSTM model...")
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks
    )

    model.save(MODEL_SAVE_PATH)
    logger.info(f"Model saved to {MODEL_SAVE_PATH}")

    # Save class map: word -> idx
    with open(CLASSES_SAVE_PATH, 'w') as f:
        json.dump(class_map, f, indent=2)
    logger.info(f"Class map saved to {CLASSES_SAVE_PATH}")

    # Save reverse map: str(idx) -> word (for inference)
    idx_to_word = {str(v): k for k, v in class_map.items()}
    idx_path = CLASSES_SAVE_PATH.replace('.json', '_indices.json')
    with open(idx_path, 'w') as f:
        json.dump(idx_to_word, f, indent=2)
    logger.info(f"Index map saved to {idx_path}")
    logger.info("Done.")
