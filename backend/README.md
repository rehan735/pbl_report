SIGN LANGUAGE RECOGNITION PROJECT

Steps to run:
1. Install dependencies:
   pip install -r backend/model/requirements.txt

2. Add dataset images into:
   backend/dataset/train/<class_name>/image.jpg

3. Train model:
   cd backend/model
   python train.py

4. Predict:
   python predict.py test_image.jpg
