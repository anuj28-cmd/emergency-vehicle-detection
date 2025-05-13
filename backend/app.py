import os
import uuid
import time
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import tensorflow as tf
from PIL import Image
import sys
import jwt
from functools import wraps

# Add parent directory to path so we can import from other modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main.Demo import predict_image
from extensions.EmergencyResponseSystem import notify_emergency_services
from extensions.SmartTrafficSystem import optimize_traffic_lights
from database import Database

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}
app.config['JWT_SECRET'] = 'your-secret-key'  # Change this to a secure key in production
app.config['JWT_EXPIRATION'] = 24 * 60 * 60  # 24 hours in seconds

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize database
db = Database()

# Initialize the model
model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                         'main', 'emergency_vehicle_model_final.h5')
try:
    model = tf.keras.models.load_model(model_path)
    print(f"Model loaded successfully from {model_path}")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def preprocess_image(image_path):
    """Preprocess the image for the model."""
    img = Image.open(image_path)
    img = img.resize((224, 224))  # Resize to match model input size
    img_array = np.array(img) / 255.0  # Normalize pixel values
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    return img_array

def analyze_image(image_path):
    """Analyze the image using our emergency vehicle detection model."""
    try:
        # Use the imported function for detection
        class_name, confidence = predict_image(image_path)
        
        # Define a minimum confidence threshold to filter out uncertain detections
        # Higher threshold = less false positives
        MIN_CONFIDENCE_THRESHOLD = 50.0  # Adjust this value based on testing
        
        # Process the detection results
        # Only consider it a valid detection if confidence exceeds the threshold
        result = class_name == 'Emergency Vehicle' and confidence >= MIN_CONFIDENCE_THRESHOLD
        
        # If confidence is below threshold, we'll report "No vehicle detected"
        detected_class = class_name
        if confidence < MIN_CONFIDENCE_THRESHOLD:
            detected_class = "No vehicle detected"
        
        # Make sure confidence is capped at 100%
        confidence = min(confidence, 100.0)
        
        # Create a mock bounding box for visualization purposes
        # In a real system, this would come from an object detection model
        bbox = None
        if result:
            # Read the image to get dimensions
            img = cv2.imread(image_path)
            h, w = img.shape[:2]
            # Create a sample bounding box (this is just for visualization)
            bbox = [int(w*0.2), int(h*0.2), int(w*0.6), int(h*0.6)]  # [x, y, width, height]
        
        # Draw bounding box on image if detection is positive
        if result and bbox:
            original_img = cv2.imread(image_path)
            x, y, w, h = bbox
            cv2.rectangle(original_img, (x, y), (x + w, y + h), (0, 0, 255), 2)
            cv2.putText(original_img, f"{detected_class}: {confidence:.2f}%", 
                       (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            
            # Save the processed image
            processed_filename = f"processed_{os.path.basename(image_path)}"
            processed_path = os.path.join(app.config['UPLOAD_FOLDER'], processed_filename)
            cv2.imwrite(processed_path, original_img)
        else:
            # If no detection or bounding box, return the original image
            processed_filename = os.path.basename(image_path)
            
        return {
            "result": result,
            "detection_type": detected_class,
            "confidence": float(confidence),
            "processed_filename": processed_filename,
            "coordinates": bbox
        }
        
    except Exception as e:
        print(f"Error analyzing image: {e}")
        return {
            "error": str(e)
        }

def generate_token(user_id, email, role):
    """Generate a JWT token for authentication"""
    payload = {
        'id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow().timestamp() + app.config['JWT_EXPIRATION']
    }
    
    return jwt.encode(payload, app.config['JWT_SECRET'], algorithm='HS256')

def token_required(f):
    """Decorator to require JWT token for protected routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            # Decode token
            data = jwt.decode(token, app.config['JWT_SECRET'], algorithms=['HS256'])
            current_user = db.get_user_by_email(data['email'])
            
            if not current_user:
                return jsonify({'message': 'Invalid token'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require admin role for admin routes"""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'admin':
            return jsonify({'message': 'Admin privileges required'}), 403
            
        return f(current_user, *args, **kwargs)
    
    return decorated

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "version": "1.0.0",
        "model_loaded": model is not None,
        "database": "connected"
    })

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    # Check if user already exists
    if db.get_user_by_email(data['email']):
        return jsonify({'message': 'User with this email already exists'}), 400
    
    # Create user
    user_id = db.add_user(
        email=data['email'],
        password=data['password'],
        name=data['name'],
        organization=data.get('organization'),
        phone=data.get('phone')
    )
    
    if not user_id:
        return jsonify({'message': 'Failed to create user'}), 500
    
    return jsonify({
        'message': 'User registered successfully',
        'id': user_id
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400
    
    # Verify user
    user = db.verify_user(data['email'], data['password'])
    
    if not user:
        return jsonify({'message': 'Invalid email or password'}), 401
    
    # Generate token
    token = generate_token(user['id'], user['email'], user['role'])
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'organization': user['organization'],
            'phone': user['phone'],
            'created_at': user['created_at'],
            'last_login': user['last_login']
        }
    })

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({
        'id': current_user['id'],
        'name': current_user['name'],
        'email': current_user['email'],
        'role': current_user['role'],
        'organization': current_user['organization'],
        'phone': current_user['phone'],
        'created_at': current_user['created_at'],
        'last_login': current_user['last_login'],
        'profile_image': current_user['profile_image']
    })

@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json()
    
    # Update user profile
    success = db.update_user_profile(
        user_id=current_user['id'],
        name=data.get('name'),
        organization=data.get('organization'),
        phone=data.get('phone')
    )
    
    if not success:
        return jsonify({'message': 'Failed to update profile'}), 500
    
    # Get updated user
    updated_user = db.get_user_by_email(current_user['email'])
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': {
            'id': updated_user['id'],
            'name': updated_user['name'],
            'email': updated_user['email'],
            'role': updated_user['role'],
            'organization': updated_user['organization'],
            'phone': updated_user['phone']
        }
    })

@app.route('/api/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('current_password') or not data.get('new_password'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    # Verify current password
    user = db.verify_user(current_user['email'], data['current_password'])
    
    if not user:
        return jsonify({'message': 'Current password is incorrect'}), 401
    
    # Change password
    success = db.change_password(current_user['id'], data['new_password'])
    
    if not success:
        return jsonify({'message': 'Failed to change password'}), 500
    
    return jsonify({'message': 'Password changed successfully'})

@app.route('/api/detect', methods=['POST'])
@token_required
def detect_vehicle(current_user):
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        # Generate a unique filename
        filename = f"{int(time.time())}_{secure_filename(file.filename)}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save the uploaded file
        file.save(file_path)
        
        # Analyze the image
        result = analyze_image(file_path)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 500
            
        # Generate a unique ID for this detection
        detection_id = str(uuid.uuid4())
        
        # If emergency vehicle detected, notify emergency services (simulation)
        if result["result"]:
            notify_emergency_services(detection_id, file_path)
            optimize_traffic_lights(detection_id, result["coordinates"])
        
        # Save detection data to database
        detection_data = {
            "detection_id": detection_id,
            "timestamp": datetime.now().isoformat(),
            "filename": filename,
            "processed_filename": result["processed_filename"],
            "detection_type": result["detection_type"],
            "confidence": result["confidence"],
            "coordinates": result["coordinates"]
        }
        
        # Save to database
        db.add_detection(detection_data, current_user['id'])
        
        # Return the analysis results
        return jsonify({
            "detection_id": detection_id,
            "detection_type": result["detection_type"],
            "confidence": result["confidence"],
            "processed_filename": result["processed_filename"],
            "coordinates": result["coordinates"]
        })
        
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/uploads/<filename>', methods=['GET'])
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/history', methods=['GET'])
@token_required
def get_detection_history(current_user):
    # Get history from database
    limit = int(request.args.get('limit', 100))
    
    # If user is admin and 'all' parameter is set, get all detections
    if current_user['role'] == 'admin' and request.args.get('all') == 'true':
        detections = db.get_detections(limit)
    else:
        # Otherwise, get only the current user's detections
        detections = db.get_detections(limit, current_user['id'])
    
    return jsonify(detections)

@app.route('/api/statistics', methods=['GET'])
@token_required
@admin_required
def get_statistics(current_user):
    # Get statistics from database
    stats = db.get_detection_stats()
    
    # Format data for frontend charts
    detection_types = [
        {'name': key, 'value': value}
        for key, value in stats['detection_types'].items()
    ]
    
    # Format monthly data
    months = sorted(stats['by_month'].keys())
    monthly_data = []
    
    for month in months:
        data = {'name': month}
        for detection_type, count in stats['by_month'][month].items():
            detection_key = detection_type.lower().replace(' ', '_')
            data[detection_key] = count
        monthly_data.append(data)
    
    return jsonify({
        'detection_types': detection_types,
        'avg_confidence': stats['avg_confidence'] or 0,
        'monthly_data': monthly_data
    })

@app.route('/api/settings', methods=['GET'])
@token_required
@admin_required
def get_settings(current_user):
    # Get all settings
    settings = {
        'detection_threshold': db.get_setting('detection_threshold') or '70',
        'notifications': db.get_setting('notifications') or 'true',
        'emergency_services': db.get_setting('emergency_services') or 'true',
        'traffic_system': db.get_setting('traffic_system') or 'true',
        'model_version': db.get_setting('model_version') or 'emergency_vehicle_model_final.h5'
    }
    
    return jsonify(settings)

@app.route('/api/settings', methods=['POST'])
@token_required
@admin_required
def update_settings(current_user):
    data = request.get_json()
    
    # Update each setting
    for key, value in data.items():
        db.set_setting(key, str(value))
    
    return jsonify({'message': 'Setttings updated successfully'})

# Main entry point
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)