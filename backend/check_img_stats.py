
from PIL import Image
import numpy as np
import sys

def check_image(path):
    img = Image.open(path).convert('L')
    arr = np.array(img) / 255.0
    mean_val = np.mean(arr)
    print(f"File: {path}")
    print(f"Mean pixel value: {mean_val:.4f}")
    print(f"Min: {np.min(arr):.4f}, Max: {np.max(arr):.4f}")
    
    # Check corners to guess background color
    corners = [arr[0,0], arr[0,-1], arr[-1,0], arr[-1,-1]]
    avg_corner = np.mean(corners)
    print(f"Corner average (approx background): {avg_corner:.4f}")

if __name__ == "__main__":
    check_image(r"c:\PROJECTS\project\backend\dataset\archive (1)\isl_data_grey_split\test\b\100.png")
