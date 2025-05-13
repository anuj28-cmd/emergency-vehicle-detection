import cv2
import numpy as np
import time
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

class SmartTrafficSystem:
    def __init__(self, model_path='emergency_vehicle_model.h5'):
        # Load the trained model
        self.model = load_model(model_path)
        self.class_names = {0: 'Emergency Vehicle', 1: 'Normal Vehicle'}
        
        # Traffic signal states
        self.SIGNAL_RED = 0
        self.SIGNAL_GREEN = 1
        self.signal_state = self.SIGNAL_RED
        self.signal_timer = 30  # seconds for normal operation
        self.last_switch_time = time.time()
        
        # Emergency vehicle detection parameters
        self.emergency_detected = False
        self.emergency_confidence_threshold = 0.75
        self.emergency_detection_count = 0
        self.consecutive_detections_needed = 5  # Reduce false positives
    
    def process_frame(self, frame):
        """Process a video frame and control traffic signals"""
        # Resize frame for model input
        input_img = cv2.resize(frame, (224, 224))
        x = image.img_to_array(input_img)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)
        
        # Make prediction
        preds = self.model.predict(x, verbose=0)
        class_idx = np.argmax(preds[0])
        confidence = preds[0][class_idx] * 100
        class_name = self.class_names[class_idx]
        
        # Check if emergency vehicle detected with high confidence
        if class_idx == 0 and confidence > self.emergency_confidence_threshold * 100:
            self.emergency_detection_count += 1
            if self.emergency_detection_count >= self.consecutive_detections_needed:
                self.emergency_detected = True
        else:
            # Gradually reduce counter to allow for momentary detection failures
            self.emergency_detection_count = max(0, self.emergency_detection_count - 1)
            if self.emergency_detection_count == 0:
                self.emergency_detected = False
        
        # Control traffic signal
        self.update_traffic_signal()
        
        # Overlay traffic signal state on frame
        color = (0, 255, 0) if self.signal_state == self.SIGNAL_GREEN else (0, 0, 255)
        signal_text = "GREEN: Emergency Priority" if (self.signal_state == self.SIGNAL_GREEN and self.emergency_detected) else \
                     "GREEN" if self.signal_state == self.SIGNAL_GREEN else "RED"
        
        # Display traffic signal
        cv2.circle(frame, (50, 50), 30, color, -1)
        cv2.putText(frame, signal_text, (100, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        # Display prediction
        result_text = f"{class_name}: {confidence:.2f}%"
        cv2.putText(frame, result_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, 
                   (0, 0, 255) if class_idx == 0 else (0, 255, 0), 2)
        
        # Display emergency detection status
        status = "EMERGENCY VEHICLE DETECTED!" if self.emergency_detected else "No emergency vehicle"
        cv2.putText(frame, status, (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 
                   0.7, (0, 0, 255) if self.emergency_detected else (255, 255, 255), 2)
        
        return frame
    
    def update_traffic_signal(self):
        """Update traffic signal based on emergency vehicle detection and timing"""
        current_time = time.time()
        elapsed_time = current_time - self.last_switch_time
        
        # If emergency vehicle detected, prioritize green signal
        if self.emergency_detected:
            if self.signal_state == self.SIGNAL_RED:
                print("Emergency vehicle detected - changing signal to GREEN")
                self.signal_state = self.SIGNAL_GREEN
                self.last_switch_time = current_time
                # Set longer green light for emergency vehicle
                self.signal_timer = 45
        else:
            # Normal traffic signal operation
            if elapsed_time > self.signal_timer:
                self.signal_state = 1 - self.signal_state  # Toggle state
                self.last_switch_time = current_time
                # Reset to standard timing
                self.signal_timer = 30 if self.signal_state == self.SIGNAL_GREEN else 20

def optimize_traffic_lights(detection_id, coordinates):
    """
    Optimizes traffic lights based on emergency vehicle detection.
    This is a simple simulation for the web app.
    
    Args:
        detection_id: Unique ID for the detection
        coordinates: Bounding box coordinates of the detected emergency vehicle
    
    Returns:
        dict: Status of the traffic light optimization
    """
    print(f"Optimizing traffic lights for emergency vehicle detection {detection_id}")
    print(f"Vehicle coordinates: {coordinates}")
    
    # In a real system, this would communicate with traffic infrastructure
    # Here we just simulate a success response
    return {
        "status": "success",
        "message": "Traffic lights optimized for emergency vehicle",
        "detection_id": detection_id,
        "timestamp": time.time()
    }

def run_smart_traffic_system():
    # Initialize system
    traffic_system = SmartTrafficSystem()
    
    # Initialize video capture
    cap = cv2.VideoCapture(0)  # Use webcam
    # cap = cv2.VideoCapture('traffic_video.mp4')  # Or use a video file
    
    print("Starting Smart Traffic System...")
    print("Press 'q' to quit")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Process frame
        processed_frame = traffic_system.process_frame(frame)
        
        # Display result
        cv2.imshow('Smart Traffic System', processed_frame)
        
        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_smart_traffic_system()