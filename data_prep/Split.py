import os
import shutil
import random
from sklearn.model_selection import train_test_split

def split_dataset(image_dir, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15):
    """
    Split images into train, validation and test sets
    """
    # Create directories if they don't exist
    for folder in ['train', 'valid', 'test']:
        for class_name in os.listdir(image_dir):
            if os.path.isdir(os.path.join(image_dir, class_name)):
                os.makedirs(os.path.join(folder, class_name), exist_ok=True)
    
    # For each class folder
    for class_name in os.listdir(image_dir):
        class_path = os.path.join(image_dir, class_name)
        if not os.path.isdir(class_path):
            continue
            
        # Get all files
        files = [f for f in os.listdir(class_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        # Split files into train, validation and test
        train_files, test_val_files = train_test_split(files, train_size=train_ratio, random_state=42)
        val_files, test_files = train_test_split(test_val_files, train_size=val_ratio/(val_ratio + test_ratio), random_state=42)
        
        # Copy files to respective directories
        for file, folder in [
            (train_files, 'train'),
            (val_files, 'valid'),
            (test_files, 'test')
        ]:
            for f in file:
                src = os.path.join(class_path, f)
                dst = os.path.join(folder, class_name, f)
                shutil.copy2(src, dst)
        
        print(f"Class {class_name} split complete:")
        print(f"Train: {len(train_files)}")
        print(f"Validation: {len(val_files)}")
        print(f"Test: {len(test_files)}\n")

# Usage
if __name__ == "__main__":
    # Use the path to your dataset folder
    image_dir = 'Indian_Balanced_Dataset'
    split_dataset(image_dir)
    print("Dataset splitting complete!")