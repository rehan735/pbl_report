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

img = cv2.imread(sys.argv[1], cv2.IMREAD_GRAYSCALE)
img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
img = img / 255.0
img = img.reshape(1, IMG_SIZE, IMG_SIZE, 1)

pred = model.predict(img)[0]
idx = int(np.argmax(pred))

print("Prediction:", index_to_label[idx])
