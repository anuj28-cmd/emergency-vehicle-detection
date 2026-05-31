import os
import csv
from main.Demo_fixed import predict_image

ROOT = os.path.dirname(os.path.abspath(__file__))
TEST_DIR = os.path.join(ROOT, 'Test')
OUT_DIR = os.path.join(ROOT, 'Results')
OUT_CSV = os.path.join(OUT_DIR, 'batch_results.csv')

os.makedirs(OUT_DIR, exist_ok=True)

image_files = [f for f in os.listdir(TEST_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

with open(OUT_CSV, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['filename', 'prediction', 'confidence'])

    for img in sorted(image_files):
        img_path = os.path.join(TEST_DIR, img)
        try:
            pred, conf = predict_image(img_path)
            writer.writerow([img, pred, float(conf)])
            print(f"{img}: {pred} ({conf:.2f})")
        except Exception as e:
            writer.writerow([img, 'error', str(e)])
            print(f"{img}: error - {e}")

print(f"Batch results written to {OUT_CSV}")
