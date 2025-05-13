import cv2
import numpy as np
import os
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# Use absolute path for model loading
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, 'emergency_vehicle_model.h5')
model = load_model(model_path)

# Define class names based on our dataset
CLASS_NAMES = {
    0: 'Emergency Vehicle', 
    1: 'Normal Vehicle'
}

def predict_image(image_path):
    # Load and preprocess the image
    img = image.load_img(image_path, target_size=(224, 224))
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    
    # Make prediction
    preds = model.predict(x)
    class_idx = np.argmax(preds[0])
    confidence = preds[0][class_idx] * 100
    
    # Map prediction to class name
    class_name = CLASS_NAMES[class_idx]
    
    return class_name, confidence

def demo_with_webcam():
    cap = cv2.VideoCapture(0)  # Use 0 for webcam
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Resize frame to model input size
        resized = cv2.resize(frame, (224, 224))
        
        # Preprocess frame
        x = image.img_to_array(resized)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)
        
        # Make prediction
        preds = model.predict(x)
        class_idx = np.argmax(preds[0])
        confidence = preds[0][class_idx] * 100
        class_name = CLASS_NAMES[class_idx]
        
        # Set color based on vehicle type (red for emergency, green for normal)
        color = (0, 0, 255) if class_idx == 0 else (0, 255, 0)
        
        # Display result on frame
        text = f"{class_name}: {confidence:.2f}%"
        cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
        
        # Show frame
        cv2.imshow('Emergency Vehicle Detection', frame)
        
        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

def test_single_image(image_path):
    class_name, confidence = predict_image(image_path)
    print(f"Prediction: {class_name}")
    print(f"Confidence: {confidence:.2f}%")
    
    # Display the image with prediction
    img = cv2.imread(image_path)
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
    print("Choose demo type:")
    print("1. Test with webcam")
    print("2. Test with single image")
    choice = input("Enter choice (1 or 2): ")
    
    if choice == '1':
        print("Starting webcam demo... Press 'q' to quit")
        demo_with_webcam()
    elif choice == '2':
        image_path = input("Enter the path to your test image: ")
        test_single_image(image_path)
    else:
        print("Invalid choice. Please run the program again.")