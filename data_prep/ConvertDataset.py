import os
import shutil
import yaml
from tqdm import tqdm
import hashlib

def convert_yolo_to_classification(dataset_dir, output_dir):
    """
    Convert YOLOv9 object detection dataset to classification format
    
    Args:
        dataset_dir: Path to YOLOv9 dataset directory
        output_dir: Path to output directory for classification dataset
    """
    # Load class names from data.yaml file
    yaml_path = os.path.join(dataset_dir, 'data.yaml')
    with open(yaml_path, 'r') as file:
        data = yaml.safe_load(file)
        class_names = data.get('names', {})
    
    print(f"Found classes: {class_names}")
    
    # Create output directory structure
    os.makedirs(output_dir, exist_ok=True)
    emergency_dir = os.path.join(output_dir, 'emergency_vehicle')
    normal_dir = os.path.join(output_dir, 'normal_vehicle')
    os.makedirs(emergency_dir, exist_ok=True)
    os.makedirs(normal_dir, exist_ok=True)
    
    # Track statistics for reporting
    stats = {
        'emergency': 0,
        'normal': 0,
        'skipped': 0
    }
    
    # Process each split (train, valid, test)
    for split in ['train', 'valid', 'test']:
        images_dir = os.path.join(dataset_dir, split, 'images')
        labels_dir = os.path.join(dataset_dir, split, 'labels')
        
        if not os.path.exists(images_dir) or not os.path.exists(labels_dir):
            print(f"Skipping {split} split - directories not found")
            continue
        
        print(f"Processing {split} split...")
        image_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        for img_file in tqdm(image_files):
            img_path = os.path.join(images_dir, img_file)
            label_file = os.path.splitext(img_file)[0] + '.txt'
            label_path = os.path.join(labels_dir, label_file)
            
            # Determine destination based on object classes in the image
            if os.path.exists(label_path):
                with open(label_path, 'r') as f:
                    labels = f.readlines()
                
                # Check if image contains priority (emergency) vehicles
                has_priority = False
                for label in labels:
                    class_id = int(label.strip().split()[0])
                    # Look for 'priority' class
                    if class_names[class_id] == 'priority':
                        has_priority = True
                        break
                
                # Create a shorter filename using hash to avoid path length issues
                file_ext = os.path.splitext(img_file)[1]
                short_hash = hashlib.md5(img_file.encode()).hexdigest()[:10]
                dest_name = f"{split}_{short_hash}{file_ext}"
                
                # Copy image to appropriate class folder
                dest_dir = emergency_dir if has_priority else normal_dir
                try:
                    shutil.copy(img_path, os.path.join(dest_dir, dest_name))
                    if has_priority:
                        stats['emergency'] += 1
                    else:
                        stats['normal'] += 1
                except Exception as e:
                    print(f"Error copying {img_file}: {e}")
                    stats['skipped'] += 1
            else:
                print(f"Warning: Label file not found for {img_file}")
                stats['skipped'] += 1
    
    # Count images in each class
    emergency_count = len(os.listdir(emergency_dir))
    normal_count = len(os.listdir(normal_dir))
    
    print(f"\nDataset conversion complete!")
    print(f"Emergency vehicles: {emergency_count} images")
    print(f"Normal vehicles: {normal_count} images")
    print(f"Skipped: {stats['skipped']} images")

if __name__ == "__main__":
    dataset_dir = 'Indian_Balanced_Dataset 2.v3i.yolov9'
    output_dir = 'vehicle_classification_dataset'
    
    convert_yolo_to_classification(dataset_dir, output_dir)