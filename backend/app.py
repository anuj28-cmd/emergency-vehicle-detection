import os
import uuid
import time
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
import secrets
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cv2
import numpy as np
from PIL import Image
import sys
import jwt
from functools import wraps

# Add parent directory to path so we can import from other modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    # Try to import from the original Demo module
    from main.Demo import predict_image
    print("Successfully imported from original Demo module")
except Exception as e:
    # If that fails, import from our fixed Demo module
    print(f"Error importing from original Demo module: {e}")
    print("Importing from fixed Demo module instead")
    from main.Demo_fixed import predict_image

import threading
from backend.database import Database

# Initialize Flask app
import os
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}
app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'your-secret-key')  # Override with env var in production
app.config['JWT_EXPIRATION'] = 24 * 60 * 60  # 24 hours in seconds

# Ensure a sufficiently strong JWT secret. Prefer setting JWT_SECRET env var in production.
env_jwt = os.environ.get('JWT_SECRET')
if env_jwt and len(env_jwt) >= 32:
    app.config['JWT_SECRET'] = env_jwt
else:
    secret_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'generated_jwt_secret.txt')
    loaded_secret = None
    if os.path.exists(secret_path):
        try:
            with open(secret_path, 'r') as f:
                content = f.read().strip()
                if content.startswith("JWT secret (generated): "):
                    loaded_secret = content.replace("JWT secret (generated): ", "").strip()
        except Exception as e:
            print(f"Error reading JWT secret from file: {e}")
            
    if loaded_secret and len(loaded_secret) >= 32:
        app.config['JWT_SECRET'] = loaded_secret
        print(f"Loaded existing JWT secret from {secret_path}")
    else:
        # Generate a secure random secret and persist it locally for development convenience
        generated = secrets.token_urlsafe(48)
        app.config['JWT_SECRET'] = generated
        try:
            with open(secret_path, 'w') as f:
                f.write(f"JWT secret (generated): {generated}\n")
            print(f"No valid JWT_SECRET env var found — generated one and saved to {secret_path}")
        except Exception:
            print("No valid JWT_SECRET env var found — generated one (not saved)")
# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize database
db = Database()

# Model loading is optional. `main.Demo` (real model) may import heavy TF at module
# import time; we rely on the earlier import attempt of `main.Demo` vs `main.Demo_fixed`.
# Set `model_loaded` based on whether the real Demo module exposed a `model` object.
model = None
model_loaded = False
try:
    demo_mod = sys.modules.get('main.Demo')
    if demo_mod is not None and getattr(demo_mod, 'model', None) is not None:
        model = getattr(demo_mod, 'model')
        model_loaded = True
except Exception:
    model = None
    model_loaded = False

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
        
        # Get token from Authorization header or query parameter
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        else:
            token = request.args.get('token')
        
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
        "model_loaded": bool(model_loaded),
        "database": "connected"
    })

@app.route('/api/register', methods=['POST'])
def register():
    import re
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'message': 'Missing required fields'}), 400
        
    email = data['email']
    password = data['password']
    
    if not isinstance(email, str) or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({'message': 'Invalid email address format'}), 400
        
    if not isinstance(password, str) or len(password) < 6:
        return jsonify({'message': 'Password must be at least 6 characters long'}), 400
    
    # Check if user already exists
    if db.get_user_by_email(email):
        return jsonify({'message': 'User with this email already exists'}), 400
    
    # Create user
    user_id = db.add_user(
        email=email,
        password=password,
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
        
    email = data['email']
    password = data['password']
    
    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({'message': 'Invalid email or password format'}), 400
    
    # Verify user
    user = db.verify_user(email, password)
    
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
    if not data:
        return jsonify({'message': 'No changes provided', 'user': current_user}), 200
        
    # Check if there's actually anything to update
    name = data.get('name')
    org = data.get('organization')
    phone = data.get('phone')
    
    if not any([name, org, phone]):
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': current_user['id'],
                'name': current_user['name'],
                'email': current_user['email'],
                'role': current_user['role'],
                'organization': current_user['organization'],
                'phone': current_user['phone']
            }
        }), 200
    
    # Update user profile
    success = db.update_user_profile(
        user_id=current_user['id'],
        name=name,
        organization=org,
        phone=phone
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
        # Validate that the file is actually a decodable image
        try:
            from PIL import Image
            img = Image.open(file.stream)
            img.verify()
            # Reset the file stream pointer after verifying
            file.stream.seek(0)
        except Exception:
            return jsonify({"error": "Uploaded file is not a valid image"}), 400

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
        
        # If emergency vehicle detected, try to notify emergency services (simulation)
        if result["result"]:
            try:
                # Import and call the emergency response simulation lazily
                ers = __import__('extensions.EmergencyResponseSystem', fromlist=['identify_emergency_type', 'calculate_location', 'dispatch_emergency_service', 'simulate_response'])
                emergency_type = ers.identify_emergency_type(file_path)
                location = ers.calculate_location(file_path)
                response = ers.dispatch_emergency_service(emergency_type, location)
                # Run simulation in background thread if available
                try:
                    threading.Thread(target=ers.simulate_response, args=(detection_id, response), daemon=True).start()
                except Exception:
                    pass
            except ModuleNotFoundError:
                # TensorFlow or extension not available — skip notification
                print('EmergencyResponseSystem extension not available; skipping notification')
            except Exception as e:
                print(f'Error calling EmergencyResponseSystem: {e}')

            try:
                sts = __import__('extensions.SmartTrafficSystem', fromlist=['optimize_traffic_lights'])
                try:
                    sts.optimize_traffic_lights(detection_id, result["coordinates"])
                except Exception:
                    pass
            except ModuleNotFoundError:
                print('SmartTrafficSystem extension not available; skipping traffic optimization')
            except Exception as e:
                print(f'Error calling SmartTrafficSystem: {e}')
        
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
        
        # Select a random start node from Nagpur nodes that is not AIIMS Nagpur
        import random
        from extensions.RouteOptimizer import NAGPUR_NODES
        nagpur_start_nodes = [node for node in NAGPUR_NODES.keys() if node != "AIIMS Nagpur"]
        random_start_node = random.choice(nagpur_start_nodes) if nagpur_start_nodes else "Sitabuldi"
        
        response_payload = {
            "detection_id": detection_id,
            "detection_type": result["detection_type"],
            "confidence": result["confidence"],
            "processed_filename": result["processed_filename"],
            "coordinates": result["coordinates"]
        }
        
        if result["result"]:
            response_payload["trigger_corridor"] = True
            response_payload["start_node"] = random_start_node
            
        return jsonify(response_payload)
        
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/uploads/<filename>', methods=['GET'])
@token_required
def uploaded_file(current_user, filename):
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
        'model_version': db.get_setting('model_version') or 'emergency_vehicle_model_final.h5',
        'retention_period': db.get_setting('retention_period') or '30',
        'api_endpoint': db.get_setting('api_endpoint') or 'http://localhost:5000'
    }
    
    return jsonify(settings)

@app.route('/api/settings', methods=['POST'])
@token_required
@admin_required
def update_settings(current_user):
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({'message': 'Invalid settings payload'}), 400
    
    # Update each setting
    for key, value in data.items():
        db.set_setting(key, str(value))
    
@app.route('/api/map/network', methods=['GET'])
@token_required
def get_map_network(current_user):
    try:
        from extensions.RouteOptimizer import get_nagpur_network
        network = get_nagpur_network()
        return jsonify(network)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/map/route', methods=['GET'])
@token_required
def get_map_route(current_user):
    start_node = request.args.get('start')
    end_node = request.args.get('end', 'AIIMS Nagpur')
    vehicle_type = request.args.get('vehicle_type', 'ambulance')
    
    if not start_node:
        return jsonify({"error": "Start node is required"}), 400
        
    try:
        from extensions.RouteOptimizer import find_shortest_path
        route_info = find_shortest_path(start_node, end_node, vehicle_type)
        if not route_info:
            return jsonify({"error": "No route found"}), 404
        return jsonify(route_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Main entry point
if __name__ == '__main__':
    # For safety, disable debugger and host locally by default.
    app.run(debug=False, host='127.0.0.1', port=5000)
