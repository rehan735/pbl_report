import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from sklearn.model_selection import train_test_split
from preprocess import preprocess_sequence
import json

# ─── Config ───────────────────────────────────────────────────────────────────
BATCH_SIZE      = 32
EPOCHS          = 50     # increased from 15 — 35-class model needs more epochs
SEQUENCE_LENGTH = 30
FEATURES        = 252    # 126 normalised + 126 velocity

# FIX: Resolve paths relative to this script's location so they always resolve
# correctly regardless of working directory
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_DATA_FILE   = os.path.join(_SCRIPT_DIR, 'synthetic_sequences.npy')
_LABELS_FILE = os.path.join(_SCRIPT_DIR, 'synthetic_labels.npy')
_CLASSES_FILE = os.path.join(_SCRIPT_DIR, 'sequence_classes.json')
_MODEL_OUT   = os.path.join(_SCRIPT_DIR, 'landmark_sequence_model.keras')
_IDX_OUT     = os.path.join(_SCRIPT_DIR, 'class_indices.json')


def load_and_preprocess_data():
    if not os.path.exists(_DATA_FILE) or not os.path.exists(_LABELS_FILE):
        print(
            f"Data files not found.\n"
            f"  Expected: {_DATA_FILE}\n"
            f"  Expected: {_LABELS_FILE}\n"
            "Run generate_synthetic_sequences.py first."
        )
        return None, None, None, None, None

    X_raw = np.load(_DATA_FILE)      # shape: (N, 30, 126)
    y_raw = np.load(_LABELS_FILE)    # shape: (N,)

    with open(_CLASSES_FILE, 'r') as f:
        class_map = json.load(f)     # {class_name: idx}

    num_classes = len(class_map)
    print(f"Loaded {len(X_raw)} sequences across {num_classes} classes.")
    print(f"Applying preprocessing (wrist-norm + velocity) ...")

    X_processed = []
    for seq in X_raw:
        # seq shape: (30, 126) -> preprocess_sequence returns (30, 252)
        p_seq = preprocess_sequence(seq)
        if len(p_seq) == SEQUENCE_LENGTH:
            X_processed.append(p_seq)

    X = np.array(X_processed)
    # One-hot encode
    y = tf.keras.utils.to_categorical(y_raw[:len(X)], num_classes=num_classes)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    return X_train, X_val, y_train, y_val, num_classes


def build_model(num_classes: int) -> Sequential:
    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(SEQUENCE_LENGTH, FEATURES)),
        LSTM(128),
        Dense(64, activation='relu'),
        Dropout(0.3),
        Dense(num_classes, activation='softmax')
    ])
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


if __name__ == "__main__":
    print("Loading data...")
    X_train, X_val, y_train, y_val, num_classes = load_and_preprocess_data()

    if X_train is None:
        raise SystemExit(1)

    print(f"Training shape: {X_train.shape}")
    model = build_model(num_classes)
    model.summary()

    callbacks = [
        EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-5),
    ]

    print("Training LSTM model...")
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks
    )

    model.save(_MODEL_OUT)
    print(f"Model saved to {_MODEL_OUT}")

    # Save reverse map {str(idx) -> class_name} for FastAPI inference
    with open(_CLASSES_FILE, 'r') as f:
        class_map = json.load(f)
    idx_to_class = {str(v): k for k, v in class_map.items()}
    with open(_IDX_OUT, 'w') as f:
        json.dump(idx_to_class, f, indent=2)
    print(f"Class indices saved to {_IDX_OUT}")
