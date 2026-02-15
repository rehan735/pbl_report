
from PIL import Image
import numpy as np
import sys

DEBUG_PATH = r"c:\PROJECTS\project\backend\uploads\debug_last_prediction.png"

def ascii_art(path):
    try:
        img = Image.open(path).convert('L')
        img = img.resize((48, 48)) # Match model input size
        arr = np.array(img)
        
        # Characters from dark to light
        chars = "@%#*+=-:. "
        
        print(f"ASCII Art for {path}:")
        for row in arr:
            line = ""
            for pixel in row:
                # pixel 0-255 -> index 0-9
                index = int(pixel / 255 * (len(chars) - 1))
                line += chars[index]
            print(line)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    ascii_art(DEBUG_PATH)
