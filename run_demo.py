import cv2
import os
import numpy as np
from main.Demo_fixed import predict_image

def test_single_image(image_path):
    """Test the emergency vehicle detection on a single image."""
    print(f"Testing image: {image_path}")
    
    # Make prediction
    class_name, confidence = predict_image(image_path)
    print(f"Prediction: {class_name}")
    print(f"Confidence: {confidence:.2f}%")
    
    # Display the image with prediction
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image from {image_path}")
        return
        
    img = cv2.resize(img, (800, 600))
    
    # Set color based on vehicle type (red for emergency, green for normal)
    color = (0, 0, 255) if class_name == 'Emergency Vehicle' else (0, 255, 0)
    
    text = f"{class_name}: {confidence:.2f}%"
    cv2.putText(img, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    cv2.imshow('Emergency Vehicle Detection', img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

if __name__ == "__main__":
    print("Emergency Vehicle Detection System")
    print("Choose an option:")
    print("1. Test with test image 1 (Ambulance)")
    print("2. Test with test image 2 (Police)")
    print("3. Test with test image 3 (Normal Traffic)")
    
    choice = input("Enter choice (1, 2, or 3): ")
    
    test_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Test')
    
    if choice == '1':
        test_single_image(os.path.join(test_dir, 'Ambulance_in_traffic.jpg'))
    elif choice == '2':
        test_single_image(os.path.join(test_dir, 'Police.jpg'))
    elif choice == '3':
        test_single_image(os.path.join(test_dir, 'Pune_Traffic.jpg'))
    else:
        print("Invalid choice. Please run the script again.")
