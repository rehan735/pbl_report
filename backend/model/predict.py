import cv2
import numpy as np
import tensorflow as tf
import json
import sys

import os

# Get directory of this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model.h5')
INDICES_PATH = os.path.join(BASE_DIR, 'class_indices.json')

IMG_SIZE = 64

model = tf.keras.models.load_model(MODEL_PATH)

with open(INDICES_PATH) as f:
    class_indices = json.load(f)

index_to_label = {v:k for k,v in class_indices.items()}

img = cv2.imread(sys.argv[1])
if img is None:
    print("Error: Could not read image")
    sys.exit(1)

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
blurred = cv2.GaussianBlur(gray, (5, 5), 0)
thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

img_resized = cv2.resize(thresh, (IMG_SIZE, IMG_SIZE))
img_normalized = img_resized / 255.0
img_reshaped = img_normalized.reshape(1, IMG_SIZE, IMG_SIZE, 1)

pred = model.predict(img_reshaped)[0]
idx = int(np.argmax(pred))

print("Prediction:", index_to_label[idx])
