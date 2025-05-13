import cv2
import numpy as np
import time
import threading
import queue
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

class CameraNode:
    """Represents a single camera in the emergency response network"""
    
    def __init__(self, camera_id, location_name, model_path='emergency_vehicle_model.h5'):
        self.camera_id = camera_id
        self.location_name = location_name
        self.model = load_model(model_path)
        self.class_names = {0: 'Emergency Vehicle', 1: 'Normal Vehicle'}
        self.last_detection_time = 0
        self.detection_cooldown = 5  # seconds
        self.emergency_detected = False
        self.emergency_confidence = 0
        self.confidence_threshold = 0.70
    
    def process_frame(self, frame):
        """Process a frame and detect emergency vehicles"""
        # Resize frame for model input
        input_img = cv2.resize(frame, (224, 224))
        x = image.img_to_array(input_img)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)
        
        # Make prediction
        preds = self.model.predict(x, verbose=0)
        class_idx = np.argmax(preds[0])
        confidence = preds[0][class_idx] * 100
        
        # Check for emergency vehicle with high confidence
        current_time = time.time()
        if class_idx == 0 and confidence > self.confidence_threshold * 100:
            self.emergency_detected = True
            self.emergency_confidence = confidence
            self.last_detection_time = current_time
        elif current_time - self.last_detection_time > self.detection_cooldown:
            self.emergency_detected = False
            self.emergency_confidence = 0
            
        # Augment video frame with detection info
        self._annotate_frame(frame, class_idx, confidence)
        
        return frame, self.emergency_detected, self.emergency_confidence
    
    def _annotate_frame(self, frame, class_idx, confidence):
        """Add visual information to the frame"""
        # Add camera ID and location
        cv2.putText(frame, f"Camera {self.camera_id}: {self.location_name}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Add detection result
        class_name = self.class_names[class_idx]
        result_text = f"{class_name}: {confidence:.2f}%"
        color = (0, 0, 255) if class_idx == 0 else (0, 255, 0)
        cv2.putText(frame, result_text, (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        # Add alert if emergency vehicle detected
        if self.emergency_detected:
            cv2.putText(frame, "EMERGENCY VEHICLE DETECTED!", 
                      (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 
                      0.9, (0, 0, 255), 2)
            # Add red border around frame
            cv2.rectangle(frame, (0, 0), (frame.shape[1]-1, frame.shape[0]-1), 
                         (0, 0, 255), 5)

class EmergencyResponseSystem:
    """Multi-camera system to track emergency vehicles across locations"""
    
    def __init__(self, model_path='emergency_vehicle_model.h5'):
        self.camera_nodes = {}
        self.alerts_queue = queue.Queue()
        self.model_path = model_path
        self.running = False
        self.emergency_tracker = {}  # Track emergency vehicles across cameras
    
    def add_camera(self, camera_id, location_name, video_source):
        """Add a camera to the monitoring system"""
        self.camera_nodes[camera_id] = {
            'node': CameraNode(camera_id, location_name, self.model_path),
            'source': video_source,
            'last_alert': 0
        }
    
    def start_monitoring(self):
        """Start monitoring all cameras"""
        self.running = True
        
        # Start a processing thread for each camera
        for camera_id, camera_info in self.camera_nodes.items():
            thread = threading.Thread(
                target=self._process_camera_feed,
                args=(camera_id, camera_info),
                daemon=True
            )
            thread.start()
        
        # Start alert processing thread
        alert_thread = threading.Thread(
            target=self._process_alerts,
            daemon=True
        )
        alert_thread.start()
        
        # Display all camera feeds
        self._display_feeds()
    
    def _process_camera_feed(self, camera_id, camera_info):
        """Process video from a specific camera"""
        node = camera_info['node']
        cap = cv2.VideoCapture(camera_info['source'])
        
        while self.running:
            ret, frame = cap.read()
            if not ret:
                # Try to reconnect if feed is lost
                time.sleep(1)
                cap = cv2.VideoCapture(camera_info['source'])
                continue
            
            # Process the frame
            processed_frame, emergency_detected, confidence = node.process_frame(frame)
            
            # Store processed frame for display
            camera_info['frame'] = processed_frame
            
            # Generate alert if emergency vehicle detected
            if emergency_detected:
                current_time = time.time()
                if current_time - camera_info['last_alert'] > 3:  # Alert cooldown
                    self.alerts_queue.put({
                        'camera_id': camera_id,
                        'location': node.location_name,
                        'confidence': confidence,
                        'timestamp': current_time,
                        'frame': processed_frame.copy()
                    })
                    camera_info['last_alert'] = current_time
                    
                    # Update emergency tracker
                    self._update_emergency_tracker(camera_id, node.location_name, confidence)
            
            time.sleep(0.01)  # Small delay to reduce CPU usage
        
        cap.release()
    
    def _update_emergency_tracker(self, camera_id, location, confidence):
        """Track emergency vehicles moving between cameras"""
        current_time = time.time()
        
        # Add new detection to tracker
        self.emergency_tracker[current_time] = {
            'camera_id': camera_id,
            'location': location,
            'confidence': confidence
        }
        
        # Clean up old detections (older than 2 minutes)
        self.emergency_tracker = {
            k: v for k, v in self.emergency_tracker.items()
            if current_time - k < 120
        }
        
        # Analyze movement pattern
        self._analyze_emergency_movement()
    
    def _analyze_emergency_movement(self):
        """Analyze emergency vehicle movement patterns"""
        # Sort detections by time
        detections = sorted(self.emergency_tracker.items())
        
        # Need at least 2 detections to analyze movement
        if len(detections) < 2:
            return
        
        # Get the two most recent detections
        latest = detections[-1][1]
        previous = detections[-2][1]
        
        # If detected at different cameras, estimate movement direction
        if latest['camera_id'] != previous['camera_id']:
            print(f"Emergency vehicle moving from {previous['location']} to {latest['location']}")
    
    def _process_alerts(self):
        """Process emergency alerts"""
        while self.running:
            try:
                alert = self.alerts_queue.get(timeout=0.5)
                print(f"ALERT! Emergency vehicle detected at {alert['location']} "
                     f"(Camera {alert['camera_id']}) with {alert['confidence']:.2f}% confidence")
                
                # Save the alert frame
                alert_filename = f"alert_{alert['camera_id']}_{int(alert['timestamp'])}.jpg"
                cv2.imwrite(alert_filename, alert['frame'])
                print(f"Alert image saved as {alert_filename}")
                
                self.alerts_queue.task_done()
            except queue.Empty:
                pass
    
    def _display_feeds(self):
        """Display all camera feeds in a grid"""
        while self.running:
            if not self.camera_nodes:
                time.sleep(0.1)
                continue
                
            # Count number of cameras to determine grid size
            n_cameras = len(self.camera_nodes)
            grid_size = int(np.ceil(np.sqrt(n_cameras)))
            
            # Create grid to display all feeds
            grid_height = 480
            grid_width = 640
            grid = np.zeros((grid_height * grid_size, grid_width * grid_size, 3), dtype=np.uint8)
            
            # Populate grid with camera feeds
            i = 0
            for camera_id, camera_info in self.camera_nodes.items():
                if 'frame' not in camera_info:
                    continue
                    
                frame = camera_info['frame']
                if frame is None:
                    continue
                    
                # Resize frame to fit in grid
                resized = cv2.resize(frame, (grid_width, grid_height))
                
                # Calculate position in grid
                row = i // grid_size
                col = i % grid_size
                
                # Place in grid
                y_start = row * grid_height
                y_end = y_start + grid_height
                x_start = col * grid_width
                x_end = x_start + grid_width
                
                grid[y_start:y_end, x_start:x_end] = resized
                i += 1
            
            # Display grid
            cv2.imshow('Emergency Response System - All Cameras', grid)
            
            # Check for exit command
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                self.running = False
                break
        
        cv2.destroyAllWindows()

# Example usage
def run_emergency_response_system():
    system = EmergencyResponseSystem()
    
    # Add cameras (in real system these would be network camera streams or video files)
    # For demo purposes, we're using the webcam multiple times
    system.add_camera(1, "Main Street", 0)  # Using webcam for demo
    
    # If you have test videos, you could use them like this:
    # system.add_camera(2, "Highway Junction", "test_video1.mp4")
    # system.add_camera(3, "Hospital Entrance", "test_video2.mp4")
    
    print("Starting Emergency Response System...")
    print("Press 'q' to quit")
    system.start_monitoring()

if __name__ == "__main__":
    run_emergency_response_system()
 
"""
Emergency Response System

This module simulates integration with an emergency response system.
In a real-world application, this would connect to actual emergency services APIs.
"""

import time
import random
import logging
import threading
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('EmergencyResponseSystem')

# Emergency service types and their simulated response centers
EMERGENCY_SERVICES = {
    'ambulance': {
        'centers': ['City General Hospital', 'Memorial Medical Center', 'St. Mary\'s Hospital'],
        'response_time': (2, 8),  # minutes (min, max)
    },
    'police': {
        'centers': ['Downtown Police Station', 'North District Police', 'Highway Patrol'],
        'response_time': (3, 10),  # minutes (min, max)
    },
    'fire': {
        'centers': ['Central Fire Department', 'Industrial Area Fire Station', 'Suburban Fire Brigade'],
        'response_time': (4, 12),  # minutes (min, max)
    }
}

# Cache of active emergency responses
active_responses = {}

def identify_emergency_type(image_path):
    """
    Analyze the image to identify the type of emergency vehicle.
    
    In a real implementation, this would use a more sophisticated model
    to classify the type of emergency vehicle.
    """
    # Simple simulation - randomly select an emergency type
    emergency_types = list(EMERGENCY_SERVICES.keys())
    
    # Use the image path to generate a deterministic but random-looking result
    # This is just for demo purposes to always return the same result for the same image
    random.seed(hash(image_path) % 10000)
    
    # Bias detection towards ambulances for this demo
    weights = [0.5, 0.3, 0.2]  # ambulance, police, fire
    
    emergency_type = random.choices(emergency_types, weights=weights, k=1)[0]
    
    return emergency_type

def calculate_location(image_path):
    """
    Simulate extracting location data from the image metadata or from 
    the system that captured the image.
    
    In a real implementation, this would use GPS data from the device
    or from image EXIF metadata.
    """
    # For demonstration, return fictional coordinates
    # Use the image path to generate deterministic but random-looking coordinates
    random.seed(hash(image_path) % 10000)
    
    latitude = 34.0522 + random.uniform(-0.1, 0.1)
    longitude = -118.2437 + random.uniform(-0.1, 0.1)
    
    return {
        'latitude': latitude, 
        'longitude': longitude,
        'accuracy': random.uniform(5, 20),  # meters
        'timestamp': datetime.now().isoformat()
    }

def dispatch_emergency_service(emergency_type, location):
    """
    Simulate dispatching the appropriate emergency service to the location.
    
    In a real implementation, this would connect to emergency services' systems.
    """
    service = EMERGENCY_SERVICES[emergency_type]
    
    # Select nearest center (simulated)
    center = random.choice(service['centers'])
    
    # Calculate estimated response time
    min_time, max_time = service['response_time']
    eta_minutes = random.uniform(min_time, max_time)
    
    return {
        'emergency_type': emergency_type,
        'responding_unit': center,
        'location': location,
        'eta_minutes': round(eta_minutes, 1),
        'dispatched_at': datetime.now().isoformat()
    }

def simulate_response(detection_id, response_data):
    """
    Simulate the emergency response process in a background thread.
    Updates the status of the response over time.
    """
    def response_simulation():
        stages = [
            "Dispatched",
            "En route",
            "Approaching location",
            "Arrived at scene"
        ]
        
        # Calculate time intervals based on ETA
        eta_seconds = response_data['eta_minutes'] * 60
        interval = eta_seconds / (len(stages) - 1)
        
        # Update status through each stage
        for i, stage in enumerate(stages):
            # Update the response status
            response_data['status'] = stage
            response_data['updated_at'] = datetime.now().isoformat()
            
            # In a real system, this would update a database
            logger.info(f"Emergency response update for {detection_id}: {stage}")
            
            # Sleep until next stage, except for the last one
            if i < len(stages) - 1:
                time.sleep(interval)
        
        # Mark as completed
        response_data['completed'] = True
        logger.info(f"Emergency response {detection_id} completed")
    
    # Start the simulation in a background thread
    thread = threading.Thread(target=response_simulation)
    thread.daemon = True  # Thread will exit when main program exits
    thread.start()

def notify_emergency_services(detection_id, image_path):
    """
    Main function to handle emergency vehicle detection and response.
    
    Args:
        detection_id: Unique identifier for this detection
        image_path: Path to the image that contains the emergency vehicle
    
    Returns:
        Response data including emergency type and dispatch details
    """
    logger.info(f"Emergency vehicle detected! ID: {detection_id}")
    
    # Identify the type of emergency vehicle
    emergency_type = identify_emergency_type(image_path)
    logger.info(f"Identified as {emergency_type}")
    
    # Get the location from the image (simulated)
    location = calculate_location(image_path)
    logger.info(f"Location: {location['latitude']}, {location['longitude']}")
    
    # Dispatch the appropriate emergency service
    response = dispatch_emergency_service(emergency_type, location)
    logger.info(f"Dispatched {response['responding_unit']} with ETA {response['eta_minutes']} minutes")
    
    # Add status to response data
    response['status'] = "Dispatched"
    response['completed'] = False
    response['updated_at'] = datetime.now().isoformat()
    
    # Store the response in our active responses
    active_responses[detection_id] = response
    
    # Simulate the response process in a background thread
    simulate_response(detection_id, response)
    
    return response

def get_response_status(detection_id):
    """
    Get the current status of an emergency response.
    
    Args:
        detection_id: The ID of the detection to check
        
    Returns:
        Current status data or None if not found
    """
    return active_responses.get(detection_id)

def get_all_active_responses():
    """
    Get all currently active emergency responses.
    
    Returns:
        Dictionary of all active responses, keyed by detection_id
    """
    return {
        k: v for k, v in active_responses.items() 
        if not v.get('completed', False)
    }

# For testing/demo purposes
if __name__ == "__main__":
    test_id = "test-123"
    test_image = "test_image.jpg"
    
    response = notify_emergency_services(test_id, test_image)
    print(f"Initial response: {response}")
    
    # Wait a bit and check status
    time.sleep(2)
    updated = get_response_status(test_id)
    print(f"Updated status: {updated}")