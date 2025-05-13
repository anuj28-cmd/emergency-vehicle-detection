import cv2
import numpy as np
import time
import heapq
import folium
import webbrowser
import os
from threading import Thread
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import random
import logging
import math
from datetime import datetime, timedelta
from collections import defaultdict

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('RouteOptimizer')

# Simulated traffic density data
TRAFFIC_DENSITY = {
    'morning_rush': {  # 7-9 AM
        'highways': 0.8,  # 80% congested
        'main_roads': 0.7,
        'side_streets': 0.4
    },
    'midday': {  # 10AM-3PM
        'highways': 0.5,
        'main_roads': 0.4,
        'side_streets': 0.3
    },
    'evening_rush': {  # 4-7PM
        'highways': 0.9,
        'main_roads': 0.8,
        'side_streets': 0.6
    },
    'night': {  # 8PM-6AM
        'highways': 0.2,
        'main_roads': 0.3,
        'side_streets': 0.1
    }
}

# Simulated set of traffic lights
TRAFFIC_LIGHTS = {}  # Will be populated with mock data

# Initialize mock traffic lights
def init_traffic_lights(city_size=5):
    """Initialize a grid of traffic lights for simulation purposes."""
    global TRAFFIC_LIGHTS
    
    # Create a grid of traffic lights
    for i in range(city_size):
        for j in range(city_size):
            light_id = f"light_{i}_{j}"
            TRAFFIC_LIGHTS[light_id] = {
                'location': (i, j),
                'status': random.choice(['red', 'green', 'yellow']),
                'next_change': datetime.now() + timedelta(seconds=random.randint(10, 60))
            }

# Call once to initialize
init_traffic_lights()

def get_time_of_day():
    """Determine the current time of day category for traffic estimation."""
    current_hour = datetime.now().hour
    
    if 7 <= current_hour < 10:
        return 'morning_rush'
    elif 10 <= current_hour < 16:
        return 'midday'
    elif 16 <= current_hour < 20:
        return 'evening_rush'
    else:
        return 'night'

def calculate_route(start_location, end_location, emergency_type=None):
    """
    Calculate the optimal route between two points considering traffic conditions.
    
    Args:
        start_location: Tuple of (latitude, longitude)
        end_location: Tuple of (latitude, longitude)
        emergency_type: Type of emergency (ambulance, police, fire) for prioritization
        
    Returns:
        Dictionary containing route details
    """
    # Get current traffic conditions
    time_of_day = get_time_of_day()
    traffic = TRAFFIC_DENSITY[time_of_day]
    
    # Calculate direct distance (as the crow flies)
    direct_distance = calculate_distance(start_location, end_location)
    
    # Simulate route calculation with traffic considerations
    # In reality, this would use mapping APIs like Google Maps or OpenStreetMap
    
    # Generate a route complexity factor based on traffic and distance
    complexity_factor = random.uniform(1.1, 1.4)  # Routes are 10-40% longer than direct path
    actual_distance = direct_distance * complexity_factor
    
    # Calculate estimated time based on different road types
    highway_percent = random.uniform(0.4, 0.7)  # Percentage of route on highways
    main_road_percent = random.uniform(0.2, 0.4)  # Percentage on main roads
    side_street_percent = 1 - highway_percent - main_road_percent  # Remaining on side streets
    
    # Average speeds (km/h) adjusted for traffic
    speeds = {
        'highways': 100 * (1 - traffic['highways'] * 0.8),  # Traffic slows by up to 80%
        'main_roads': 60 * (1 - traffic['main_roads'] * 0.7),
        'side_streets': 30 * (1 - traffic['side_streets'] * 0.6)
    }
    
    # Calculate time for each segment
    highway_time = (actual_distance * highway_percent) / speeds['highways']
    main_road_time = (actual_distance * main_road_percent) / speeds['main_roads']
    side_street_time = (actual_distance * side_street_percent) / speeds['side_streets']
    
    total_time_hours = highway_time + main_road_time + side_street_time
    
    # Convert to minutes
    eta_minutes = total_time_hours * 60
    
    # Emergency vehicles get priority adjustments
    if emergency_type:
        # Emergency vehicles can go faster and get traffic priority
        priority_factor = {
            'ambulance': 0.7,  # 30% time reduction
            'police': 0.75,
            'fire': 0.6  # Fire trucks get highest priority
        }.get(emergency_type, 0.85)
        
        eta_minutes *= priority_factor
    
    # Generate a list of waypoints (simplified - in real app would be actual coordinates)
    num_waypoints = max(3, int(direct_distance / 5))  # One waypoint every 5km roughly
    waypoints = generate_waypoints(start_location, end_location, num_waypoints)
    
    return {
        'start_location': start_location,
        'end_location': end_location,
        'distance_km': round(actual_distance, 2),
        'estimated_time_min': round(eta_minutes, 1),
        'traffic_conditions': time_of_day,
        'route_waypoints': waypoints,
        'timestamp': datetime.now().isoformat()
    }

def calculate_distance(point1, point2):
    """
    Calculate the distance between two points using the Haversine formula.
    
    Args:
        point1: Tuple of (latitude, longitude)
        point2: Tuple of (latitude, longitude)
        
    Returns:
        Distance in kilometers
    """
    # Unpack latitude and longitude
    lat1, lon1 = point1
    lat2, lon2 = point2
    
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of Earth in kilometers
    r = 6371
    
    return c * r

def generate_waypoints(start, end, num_points):
    """Generate a series of waypoints between start and end locations."""
    waypoints = [start]
    
    # Create intermediate points with slight random variations
    start_lat, start_lon = start
    end_lat, end_lon = end
    
    for i in range(1, num_points):
        # Interpolate position
        ratio = i / num_points
        lat = start_lat + (end_lat - start_lat) * ratio
        lon = start_lon + (end_lon - start_lon) * ratio
        
        # Add some randomness to simulate actual routes that aren't straight lines
        lat += random.uniform(-0.01, 0.01)
        lon += random.uniform(-0.01, 0.01)
        
        waypoints.append((lat, lon))
    
    waypoints.append(end)
    return waypoints

def synchronize_traffic_lights(route, emergency_type):
    """
    Simulate traffic light synchronization for emergency vehicles.
    
    Args:
        route: The calculated route details
        emergency_type: Type of emergency vehicle
        
    Returns:
        List of synchronized traffic lights
    """
    # In a real system, this would communicate with the actual traffic management system
    
    # Get traffic lights near the route (simplified simulation)
    waypoints = route['route_waypoints']
    
    affected_lights = []
    for light_id, light in TRAFFIC_LIGHTS.items():
        light_location = light['location']
        
        # Check if this light is close to any waypoint
        for waypoint in waypoints:
            if is_close(light_location, waypoint, threshold=0.5):  # Within 0.5 units
                affected_lights.append(light_id)
                break
    
    # Simulate changing these lights to green for the emergency vehicle
    synchronized = []
    for light_id in affected_lights:
        # In a real system, this would request the traffic management system to change the light
        TRAFFIC_LIGHTS[light_id]['status'] = 'green'
        TRAFFIC_LIGHTS[light_id]['next_change'] = datetime.now() + timedelta(minutes=5)
        
        synchronized.append({
            'light_id': light_id,
            'location': TRAFFIC_LIGHTS[light_id]['location'],
            'synchronized_until': TRAFFIC_LIGHTS[light_id]['next_change'].isoformat()
        })
    
    return synchronized

def is_close(point1, point2, threshold=0.1):
    """Check if two points are close to each other."""
    # In a simulation with unit coordinates
    x1, y1 = point1
    x2, y2 = point2
    
    # Simple Euclidean distance
    distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
    return distance <= threshold

def optimize_emergency_route(start_location, end_location, emergency_type):
    """
    Main function to optimize routes for emergency vehicles.
    
    Args:
        start_location: Tuple of (latitude, longitude)
        end_location: Tuple of (latitude, longitude)
        emergency_type: Type of emergency (ambulance, police, fire)
        
    Returns:
        Dictionary containing route optimization details
    """
    logger.info(f"Optimizing route for {emergency_type} from {start_location} to {end_location}")
    
    # Calculate the best route
    route = calculate_route(start_location, end_location, emergency_type)
    
    # Synchronize traffic lights along the route
    synchronized_lights = synchronize_traffic_lights(route, emergency_type)
    
    # Enhance the route data with traffic light info
    route['synchronized_lights'] = synchronized_lights
    route['priority_level'] = {
        'ambulance': 'highest',
        'police': 'high',
        'fire': 'highest'
    }.get(emergency_type, 'normal')
    
    logger.info(f"Route optimized. ETA: {route['estimated_time_min']} minutes")
    logger.info(f"Synchronized {len(synchronized_lights)} traffic lights for priority passage")
    
    return route

# For testing/demo purposes
if __name__ == "__main__":
    # Test the route optimizer with sample coordinates
    start = (34.0522, -118.2437)  # Example: Los Angeles
    end = (34.1478, -118.1445)    # Example: Pasadena
    
    result = optimize_emergency_route(start, end, 'ambulance')
    print(f"Route from LA to Pasadena:")
    print(f"Distance: {result['distance_km']} km")
    print(f"ETA: {result['estimated_time_min']} minutes")
    print(f"Traffic lights synchronized: {len(result['synchronized_lights'])}")