# Emergency Vehicles Detection

## Project Overview
This project implements a computer vision system designed to detect emergency vehicles in traffic scenarios. The system uses deep learning models trained on Indian traffic datasets to identify emergency vehicles like ambulances and police cars, enabling priority routing and traffic management.

## Dataset
The project uses the Indian Balanced Dataset 2.v3i.yolov9, which contains:
- Images of various vehicles in Indian traffic scenarios
- Labeled data for emergency vehicles (ambulances, police vehicles)
- Training, validation, and testing splits

## Project Structure
- `data_prep/`: Scripts for dataset preparation and processing
  - `ConvertDataset.py`: Converts dataset formats
  - `Split.py`: Splits data into training and validation sets
  
- `model_training/`: Code for model development
  - `Model.py`: Implementation of the emergency vehicle detection model
  
- `main/`: Core application files
  - `Demo.py`: Demo application to run the detection system
  - `emergency_vehicle_model.h5`: Trained model weights
  - `emergency_vehicle_model_final.h5`: Final optimized model
  
- `extensions/`: Additional system components
  - `EmergencyResponseSystem.py`: Alert system for emergency vehicles
  - `RouteOptimizer.py`: Optimizes routes for detected emergency vehicles
  - `SmartTrafficSystem.py`: Traffic control integration
  
- `frontend/`: React-based web interface
  - Interactive dashboard for monitoring
  - Real-time detection interface
  - Detection history and analytics
  
- `backend/`: Flask API server
  - RESTful API for the detection system
  - User authentication and management
  - Detection history storage
  
- `Test/`: Test images for model evaluation

## Installation and Setup

### Backend Setup
1. Clone this repository
2. Navigate to the backend directory:
   ```
   cd backend
   ```
3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Start the Flask server:
   ```
   python app.py
   ```
   The backend server will run on http://localhost:5000

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```
2. Install Node.js dependencies:
   ```
   npm install
   ```
3. Start the React development server:
   ```
   npm start
   ```
   The frontend will be available at http://localhost:3000

### Model Training (Optional)
If you want to train the model yourself:
1. Navigate to the model_training directory
2. Run the training script:
   ```
   python Model.py
   ```

## Usage

### Command Line Demo
Run the demo application:
```
python main/Demo.py
```

### Web Interface
1. Start both backend and frontend servers as described in the installation steps
2. Open your browser and navigate to http://localhost:3000
3. Log in with your credentials or register a new account
4. Use the detector page to upload images or use your webcam for real-time detection

## Model Performance
The emergency vehicle detection model achieves:
- High accuracy in varying traffic conditions
- Real-time detection capability
- Robustness to different weather and lighting conditions

## Future Work
- Integration with traffic management systems
- Mobile application development
- Extended detection capabilities for additional emergency vehicle types
- Improved real-time performance

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.