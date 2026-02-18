
from PIL import Image
import numpy as np
import os

DEBUG_PATH = r"c:\PROJECTS\project\backend\uploads\debug_last_prediction.png"

if os.path.exists(DEBUG_PATH):
    img = Image.open(DEBUG_PATH)
    arr = np.array(img) / 255.0
    print(f"File: {DEBUG_PATH}")
    print(f"Mean: {np.mean(arr):.4f}")
    print(f"Std Dev: {np.std(arr):.4f}")
    print(f"Min: {np.min(arr):.4f}, Max: {np.max(arr):.4f}")
else:
    print("Debug image not found.")
