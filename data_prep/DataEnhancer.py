import os
import yaml
import cv2
import numpy as np
import random
import glob
import shutil
from pathlib import Path
from tqdm import tqdm
import albumentations as A
from PIL import Image, ImageEnhance, ImageFilter

class EmergencyVehicleDataEnhancer:
    """
    A class to enhance emergency vehicle datasets for improved detection
    in challenging weather and traffic conditions
    """
    
    def __init__(self, data_yaml_path, output_dir="Enhanced_Dataset"):
        """
        Initialize the dataset enhancer
        
        Args:
            data_yaml_path: Path to the YOLO format data.yaml file
            output_dir: Directory to save enhanced dataset
        """
        self.data_yaml_path = data_yaml_path
        self.output_dir = output_dir
        
        # Load data configuration
        with open(data_yaml_path, 'r') as f:
            self.data_config = yaml.safe_load(f)
        
        # Get paths
        self.data_dir = os.path.dirname(data_yaml_path)
        self.train_dir = os.path.join(self.data_dir, self.data_config['train'].replace('../', ''))
        self.val_dir = os.path.join(self.data_dir, self.data_config['val'].replace('../', ''))
        self.test_dir = os.path.join(self.data_dir, self.data_config['test'].replace('../', ''))
        
        # Create output directories
        self.train_out_dir = os.path.join(self.output_dir, "train")
        self.val_out_dir = os.path.join(self.output_dir, "valid")
        self.test_out_dir = os.path.join(self.output_dir, "test")
        
        os.makedirs(self.train_out_dir, exist_ok=True)
        os.makedirs(os.path.join(self.train_out_dir, "images"), exist_ok=True)
        os.makedirs(os.path.join(self.train_out_dir, "labels"), exist_ok=True)
        os.makedirs(self.val_out_dir, exist_ok=True)
        os.makedirs(os.path.join(self.val_out_dir, "images"), exist_ok=True)
        os.makedirs(os.path.join(self.val_out_dir, "labels"), exist_ok=True)
        os.makedirs(self.test_out_dir, exist_ok=True)
        os.makedirs(os.path.join(self.test_out_dir, "images"), exist_ok=True)
        os.makedirs(os.path.join(self.test_out_dir, "labels"), exist_ok=True)
        
        print(f"Initialized data enhancer for {data_yaml_path}")
        print(f"Train directory: {self.train_dir}")
        print(f"Classes: {self.data_config['names']}")
    
    def copy_original_dataset(self):
        """
        Copy the original dataset to the output directory
        """
        # Copy training data
        train_images = glob.glob(os.path.join(self.train_dir, "*.jpg")) + \
                      glob.glob(os.path.join(self.train_dir, "*.jpeg")) + \
                      glob.glob(os.path.join(self.train_dir, "*.png"))
        
        # Find label directory
        train_label_dir = os.path.join(os.path.dirname(self.train_dir), "labels")
        
        for img_path in tqdm(train_images, desc="Copying training images"):
            # Copy image
            img_filename = os.path.basename(img_path)
            dst_img_path = os.path.join(self.train_out_dir, "images", img_filename)
            shutil.copy(img_path, dst_img_path)
            
            # Copy corresponding label
            label_filename = os.path.splitext(img_filename)[0] + ".txt"
            src_label_path = os.path.join(train_label_dir, label_filename)
            dst_label_path = os.path.join(self.train_out_dir, "labels", label_filename)
            
            if os.path.exists(src_label_path):
                shutil.copy(src_label_path, dst_label_path)
        
        # Copy validation data (similar process)
        val_images = glob.glob(os.path.join(self.val_dir, "*.jpg")) + \
                    glob.glob(os.path.join(self.val_dir, "*.jpeg")) + \
                    glob.glob(os.path.join(self.val_dir, "*.png"))
        
        val_label_dir = os.path.join(os.path.dirname(self.val_dir), "labels")
        
        for img_path in tqdm(val_images, desc="Copying validation images"):
            img_filename = os.path.basename(img_path)
            dst_img_path = os.path.join(self.val_out_dir, "images", img_filename)
            shutil.copy(img_path, dst_img_path)
            
            label_filename = os.path.splitext(img_filename)[0] + ".txt"
            src_label_path = os.path.join(val_label_dir, label_filename)
            dst_label_path = os.path.join(self.val_out_dir, "labels", label_filename)
            
            if os.path.exists(src_label_path):
                shutil.copy(src_label_path, dst_label_path)
        
        # Copy test data (similar process)
        test_images = glob.glob(os.path.join(self.test_dir, "*.jpg")) + \
                     glob.glob(os.path.join(self.test_dir, "*.jpeg")) + \
                     glob.glob(os.path.join(self.test_dir, "*.png"))
        
        test_label_dir = os.path.join(os.path.dirname(self.test_dir), "labels")
        
        for img_path in tqdm(test_images, desc="Copying test images"):
            img_filename = os.path.basename(img_path)
            dst_img_path = os.path.join(self.test_out_dir, "images", img_filename)
            shutil.copy(img_path, dst_img_path)
            
            label_filename = os.path.splitext(img_filename)[0] + ".txt"
            src_label_path = os.path.join(test_label_dir, label_filename)
            dst_label_path = os.path.join(self.test_out_dir, "labels", label_filename)
            
            if os.path.exists(src_label_path):
                shutil.copy(src_label_path, dst_label_path)
        
        print(f"Original dataset copied to {self.output_dir}")
    
    def generate_rain_effect(self, img_path, label_path, severity=None):
        """
        Generate rain effect on an image
        
        Args:
            img_path: Path to the image
            label_path: Path to the label file
            severity: Rain severity (None for random)
            
        Returns:
            Tuple of (augmented image, label data)
        """
        # Read image
        image = cv2.imread(img_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Read label
        with open(label_path, 'r') as f:
            label_data = f.read()
        
        # Set rain severity
        if severity is None:
            severity = random.uniform(0.3, 0.7)
        
        # Create rain effect using Albumentations
        transform = A.Compose([
            A.RandomRain(
                slant_lower=-10, 
                slant_upper=10, 
                drop_length=20, 
                drop_width=1, 
                drop_color=(200, 200, 200), 
                blur_value=5, 
                brightness_coefficient=0.7,
                p=severity
            ),
            A.RandomBrightnessContrast(brightness_limit=(-0.1, 0), p=0.8)
        ])
        
        # Apply transformation
        augmented = transform(image=image)
        rain_image = augmented["image"]
        
        # Convert back to BGR for saving with OpenCV
        rain_image = cv2.cvtColor(rain_image, cv2.COLOR_RGB2BGR)
        
        return rain_image, label_data
    
    def generate_night_effect(self, img_path, label_path, severity=None):
        """
        Generate night effect on an image
        
        Args:
            img_path: Path to the image
            label_path: Path to the label file
            severity: Night darkness severity (None for random)
            
        Returns:
            Tuple of (augmented image, label data)
        """
        # Read image with PIL for better night effect
        image = Image.open(img_path)
        
        # Read label
        with open(label_path, 'r') as f:
            label_data = f.read()
        
        # Set night severity
        if severity is None:
            severity = random.uniform(0.4, 0.7)
        
        # Reduce brightness
        enhancer = ImageEnhance.Brightness(image)
        darkened = enhancer.enhance(severity)
        
        # Add blue tint for night effect
        r, g, b = darkened.split()
        r = ImageEnhance.Brightness(r).enhance(0.9)
        g = ImageEnhance.Brightness(g).enhance(0.95)
        # Enhance blue channel slightly
        b = ImageEnhance.Brightness(b).enhance(1.05)
        
        night_image = Image.merge('RGB', (r, g, b))
        
        # Add slight blur for night vision effect
        night_image = night_image.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        # Convert to numpy array for saving with OpenCV
        night_image_np = np.array(night_image)
        night_image_np = cv2.cvtColor(night_image_np, cv2.COLOR_RGB2BGR)
        
        return night_image_np, label_data
    
    def generate_traffic_occlusion(self, img_path, label_path):
        """
        Generate traffic occlusion effect (simulating heavy traffic)
        
        Args:
            img_path: Path to the image
            label_path: Path to the label file
            
        Returns:
            Tuple of (augmented image, label data)
        """
        # Read image
        image = cv2.imread(img_path)
        
        # Read label
        with open(label_path, 'r') as f:
            label_data = f.read()
        
        # Create occlusion effect using random shapes
        h, w = image.shape[:2]
        
        # Number of occlusion shapes (vehicles)
        num_shapes = random.randint(3, 8)
        
        # Create occlusion mask
        for _ in range(num_shapes):
            # Random position and size for occlusion
            x = random.randint(0, w - 1)
            y = random.randint(0, h - 1)
            width = random.randint(w // 10, w // 5)
            height = random.randint(h // 10, h // 5)
            
            # Don't occlude emergency vehicles (skip occlusion if label indicates priority class there)
            skip_occlusion = False
            for line in label_data.splitlines():
                if line.strip():
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        cls_id = int(parts[0])
                        # Check if this is emergency vehicle class (priority)
                        if cls_id == 4:  # Assuming 4 is the priority class
                            # Calculate bbox coordinates
                            cx, cy, bw, bh = map(float, parts[1:5])
                            x1 = int((cx - bw/2) * w)
                            y1 = int((cy - bh/2) * h)
                            x2 = int((cx + bw/2) * w)
                            y2 = int((cy + bh/2) * h)
                            
                            # Check if occlusion overlaps with emergency vehicle
                            if (x < x2 and x + width > x1 and 
                                y < y2 and y + height > y1):
                                skip_occlusion = True
                                break
            
            if not skip_occlusion:
                # Random color for occlusion (vehicle-like colors)
                color = (
                    random.randint(100, 200),  # B
                    random.randint(100, 200),  # G
                    random.randint(100, 200)   # R
                )
                
                # Draw rectangle (vehicle)
                cv2.rectangle(image, (x, y), (x + width, y + height), color, -1)
                
                # Add some details to make it look like a vehicle
                cv2.rectangle(image, (x, y), (x + width, y + height), (50, 50, 50), 1)
                
                # Add "windows"
                window_h = height // 3
                window_margin = width // 10
                cv2.rectangle(
                    image, 
                    (x + window_margin, y + window_h // 2), 
                    (x + width - window_margin, y + window_h), 
                    (200, 200, 200), 
                    -1
                )
        
        return image, label_data
    
    def generate_blur_effect(self, img_path, label_path):
        """
        Generate motion blur effect (simulating fast movement)
        
        Args:
            img_path: Path to the image
            label_path: Path to the label file
            
        Returns:
            Tuple of (augmented image, label data)
        """
        # Read image
        image = cv2.imread(img_path)
        
        # Read label
        with open(label_path, 'r') as f:
            label_data = f.read()
        
        # Apply motion blur using Albumentations
        transform = A.Compose([
            A.MotionBlur(blur_limit=(10, 20), p=1.0)
        ])
        
        augmented = transform(image=image)
        blurred_image = augmented["image"]
        
        return blurred_image, label_data
    
    def enhance_dataset(self, rain_ratio=0.25, night_ratio=0.25, traffic_ratio=0.25, blur_ratio=0.15):
        """
        Enhance the dataset with various augmentations
        
        Args:
            rain_ratio: Ratio of images to apply rain effect
            night_ratio: Ratio of images to apply night effect
            traffic_ratio: Ratio of images to apply traffic occlusion
            blur_ratio: Ratio of images to apply motion blur
        """
        # First, copy the original dataset
        self.copy_original_dataset()
        
        # Get emergency vehicle images (priority class)
        train_images_dir = os.path.join(self.train_out_dir, "images")
        train_labels_dir = os.path.join(self.train_out_dir, "labels")
        
        all_images = glob.glob(os.path.join(train_images_dir, "*.jpg")) + \
                    glob.glob(os.path.join(train_images_dir, "*.jpeg")) + \
                    glob.glob(os.path.join(train_images_dir, "*.png"))
        
        # Filter for images with emergency vehicles
        emergency_images = []
        for img_path in all_images:
            img_filename = os.path.basename(img_path)
            label_filename = os.path.splitext(img_filename)[0] + ".txt"
            label_path = os.path.join(train_labels_dir, label_filename)
            
            if os.path.exists(label_path):
                with open(label_path, 'r') as f:
                    label_content = f.read()
                    # Check if the priority class (4) is in the label
                    if any(line.strip().startswith('4 ') for line in label_content.splitlines()):
                        emergency_images.append((img_path, label_path))
        
        print(f"Found {len(emergency_images)} images with emergency vehicles")
        
        # Calculate number of images to augment
        num_rain = int(len(emergency_images) * rain_ratio)
        num_night = int(len(emergency_images) * night_ratio)
        num_traffic = int(len(emergency_images) * traffic_ratio)
        num_blur = int(len(emergency_images) * blur_ratio)
        
        # Shuffle the list for random selection
        random.shuffle(emergency_images)
        
        # Apply rain effect
        for i, (img_path, label_path) in enumerate(tqdm(emergency_images[:num_rain], desc="Generating rain effects")):
            img_filename = os.path.basename(img_path)
            base_name, ext = os.path.splitext(img_filename)
            
            # Generate rain effect
            rain_image, label_data = self.generate_rain_effect(img_path, label_path)
            
            # Save augmented image
            rain_filename = f"{base_name}_rain{ext}"
            rain_path = os.path.join(train_images_dir, rain_filename)
            cv2.imwrite(rain_path, rain_image)
            
            # Save corresponding label (same as original)
            rain_label_filename = f"{base_name}_rain.txt"
            rain_label_path = os.path.join(train_labels_dir, rain_label_filename)
            with open(rain_label_path, 'w') as f:
                f.write(label_data)
        
        # Apply night effect
        for i, (img_path, label_path) in enumerate(tqdm(emergency_images[num_rain:num_rain+num_night], desc="Generating night effects")):
            img_filename = os.path.basename(img_path)
            base_name, ext = os.path.splitext(img_filename)
            
            # Generate night effect
            night_image, label_data = self.generate_night_effect(img_path, label_path)
            
            # Save augmented image
            night_filename = f"{base_name}_night{ext}"
            night_path = os.path.join(train_images_dir, night_filename)
            cv2.imwrite(night_path, night_image)
            
            # Save corresponding label (same as original)
            night_label_filename = f"{base_name}_night.txt"
            night_label_path = os.path.join(train_labels_dir, night_label_filename)
            with open(night_label_path, 'w') as f:
                f.write(label_data)
        
        # Apply traffic occlusion effect
        for i, (img_path, label_path) in enumerate(tqdm(emergency_images[num_rain+num_night:num_rain+num_night+num_traffic], desc="Generating traffic effects")):
            img_filename = os.path.basename(img_path)
            base_name, ext = os.path.splitext(img_filename)
            
            # Generate traffic occlusion effect
            traffic_image, label_data = self.generate_traffic_occlusion(img_path, label_path)
            
            # Save augmented image
            traffic_filename = f"{base_name}_traffic{ext}"
            traffic_path = os.path.join(train_images_dir, traffic_filename)
            cv2.imwrite(traffic_path, traffic_image)
            
            # Save corresponding label (same as original)
            traffic_label_filename = f"{base_name}_traffic.txt"
            traffic_label_path = os.path.join(train_labels_dir, traffic_label_filename)
            with open(traffic_label_path, 'w') as f:
                f.write(label_data)
        
        # Apply motion blur effect
        for i, (img_path, label_path) in enumerate(tqdm(emergency_images[num_rain+num_night+num_traffic:num_rain+num_night+num_traffic+num_blur], desc="Generating blur effects")):
            img_filename = os.path.basename(img_path)
            base_name, ext = os.path.splitext(img_filename)
            
            # Generate blur effect
            blur_image, label_data = self.generate_blur_effect(img_path, label_path)
            
            # Save augmented image
            blur_filename = f"{base_name}_blur{ext}"
            blur_path = os.path.join(train_images_dir, blur_filename)
            cv2.imwrite(blur_path, blur_image)
            
            # Save corresponding label (same as original)
            blur_label_filename = f"{base_name}_blur.txt"
            blur_label_path = os.path.join(train_labels_dir, blur_label_filename)
            with open(blur_label_path, 'w') as f:
                f.write(label_data)
        
        # Create combined effects (rain + night, etc.)
        print("Generating combined effects...")
        selected_images = emergency_images[:min(50, len(emergency_images))]
        
        for i, (img_path, label_path) in enumerate(tqdm(selected_images, desc="Generating combined effects")):
            img_filename = os.path.basename(img_path)
            base_name, ext = os.path.splitext(img_filename)
            
            # Generate night + rain effect
            night_image, _ = self.generate_night_effect(img_path, label_path, severity=0.6)
            night_rain_image, label_data = self.generate_rain_effect(img_path, label_path, severity=0.8)
            
            # Save night + rain image
            combined_filename = f"{base_name}_night_rain{ext}"
            combined_path = os.path.join(train_images_dir, combined_filename)
            cv2.imwrite(combined_path, night_rain_image)
            
            # Save corresponding label
            combined_label_filename = f"{base_name}_night_rain.txt"
            combined_label_path = os.path.join(train_labels_dir, combined_label_filename)
            with open(combined_label_path, 'w') as f:
                f.write(label_data)
            
            # Generate night + traffic effect
            night_image, _ = self.generate_night_effect(img_path, label_path, severity=0.5)
            night_traffic_image, label_data = self.generate_traffic_occlusion(img_path, label_path)
            
            # Save night + traffic image
            combined_filename = f"{base_name}_night_traffic{ext}"
            combined_path = os.path.join(train_images_dir, combined_filename)
            cv2.imwrite(combined_path, night_traffic_image)
            
            # Save corresponding label
            combined_label_filename = f"{base_name}_night_traffic.txt"
            combined_label_path = os.path.join(train_labels_dir, combined_label_filename)
            with open(combined_label_path, 'w') as f:
                f.write(label_data)
        
        # Create new data.yaml file
        enhanced_yaml = {
            'train': './train/images',
            'val': './valid/images',
            'test': './test/images',
            'nc': self.data_config['nc'],
            'names': self.data_config['names']
        }
        
        with open(os.path.join(self.output_dir, 'data.yaml'), 'w') as f:
            yaml.dump(enhanced_yaml, f, default_flow_style=False)
        
        print(f"Dataset enhancement complete!")
        print(f"Original images: {len(all_images)}")
        print(f"Added rain effects: {num_rain}")
        print(f"Added night effects: {num_night}")
        print(f"Added traffic effects: {num_traffic}")
        print(f"Added blur effects: {num_blur}")
        print(f"Added combined effects: {min(50, len(emergency_images)) * 2}")
        print(f"Total training images: {len(all_images) + num_rain + num_night + num_traffic + num_blur + min(50, len(emergency_images)) * 2}")

# Example usage
if __name__ == "__main__":
    data_yaml_path = "Data/data.yaml"
    output_dir = "Enhanced_Dataset"
    
    enhancer = EmergencyVehicleDataEnhancer(data_yaml_path, output_dir)
    enhancer.enhance_dataset(
        rain_ratio=0.25,
        night_ratio=0.25,
        traffic_ratio=0.25,
        blur_ratio=0.15
    )
