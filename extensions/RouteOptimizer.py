import heapq
import logging

logger = logging.getLogger('RouteOptimizer')

# Nagpur Network Landmarks & Intersections
NAGPUR_NODES = {
    "Sitabuldi": {"lat": 21.1458, "lng": 79.0882, "name": "Sitabuldi Interchange", "has_light": True},
    "Dharampeth": {"lat": 21.1420, "lng": 79.0650, "name": "Dharampeth Square", "has_light": True},
    "Shankar Nagar": {"lat": 21.1310, "lng": 79.0630, "name": "Shankar Nagar Square", "has_light": True},
    "Rahate Colony": {"lat": 21.1270, "lng": 79.0780, "name": "Rahate Colony T-Point", "has_light": True},
    "Congress Nagar": {"lat": 21.1340, "lng": 79.0810, "name": "Congress Nagar T-Point", "has_light": False},
    "Deekshabhoomi": {"lat": 21.1280, "lng": 79.0680, "name": "Deekshabhoomi Chowk", "has_light": False},
    "Laxmi Nagar": {"lat": 21.1220, "lng": 79.0620, "name": "Laxmi Nagar Chowk", "has_light": True},
    "Pratap Nagar": {"lat": 21.1150, "lng": 79.0550, "name": "Pratap Nagar Square", "has_light": True},
    "Khamla": {"lat": 21.1080, "lng": 79.0620, "name": "Khamla Chowk", "has_light": True},
    "Sonegaon": {"lat": 21.0950, "lng": 79.0650, "name": "Sonegaon T-Point", "has_light": False},
    "Airport Chowk": {"lat": 21.0920, "lng": 79.0760, "name": "Airport Square (Wardha Rd)", "has_light": True},
    "Manish Nagar": {"lat": 21.0958, "lng": 79.0882, "name": "Manish Nagar Crossing", "has_light": True},
    "MIHAN": {"lat": 21.0658, "lng": 79.0582, "name": "MIHAN Flyover", "has_light": True},
    "AIIMS Nagpur": {"lat": 21.0258, "lng": 79.0282, "name": "AIIMS Emergency Gate", "has_light": False}
}

# Nagpur Road Network Edge Connections
# Structure: (NodeA, NodeB, distance_km, speed_limit_kmh, normal_traffic_factor)
NAGPUR_EDGES = [
    ("Sitabuldi", "Dharampeth", 2.2, 40, 1.2),
    ("Sitabuldi", "Congress Nagar", 1.5, 35, 1.4),
    ("Dharampeth", "Shankar Nagar", 1.3, 40, 1.1),
    ("Shankar Nagar", "Deekshabhoomi", 1.1, 30, 1.0),
    ("Congress Nagar", "Rahate Colony", 1.0, 45, 1.3),
    ("Deekshabhoomi", "Rahate Colony", 1.2, 35, 1.2),
    ("Deekshabhoomi", "Laxmi Nagar", 0.9, 40, 1.1),
    ("Rahate Colony", "Laxmi Nagar", 1.8, 45, 1.2),
    ("Laxmi Nagar", "Pratap Nagar", 1.2, 40, 1.3),
    ("Laxmi Nagar", "Khamla", 1.6, 35, 1.2),
    ("Pratap Nagar", "Khamla", 1.1, 35, 1.1),
    ("Khamla", "Sonegaon", 1.5, 30, 1.0),
    ("Rahate Colony", "Airport Chowk", 4.0, 50, 1.5),
    ("Sonegaon", "Airport Chowk", 1.4, 40, 1.1),
    ("Airport Chowk", "Manish Nagar", 1.8, 30, 1.6),
    ("Airport Chowk", "MIHAN", 3.2, 60, 1.2),
    ("MIHAN", "AIIMS Nagpur", 4.8, 60, 1.0)
]

def get_nagpur_network():
    """Returns the full network representation of Nagpur for map drawing."""
    return {
        "nodes": NAGPUR_NODES,
        "edges": [
            {
                "u": edge[0],
                "v": edge[1],
                "distance_km": edge[2],
                "speed_limit_kmh": edge[3],
                "traffic_factor": edge[4]
            }
            for edge in NAGPUR_EDGES
        ]
    }

def find_shortest_path(start, end="AIIMS Nagpur", vehicle_type="ambulance"):
    """
    Computes the fastest route using Dijkstra's shortest path algorithm.
    Adjusts traffic congestion delays for emergency priority depending on vehicle type.
    """
    if start not in NAGPUR_NODES or end not in NAGPUR_NODES:
        logger.error(f"Invalid start or end node: {start} -> {end}")
        return None

    # Build adjacency list
    adj = {node: [] for node in NAGPUR_NODES}
    for u, v, dist, speed, traffic in NAGPUR_EDGES:
        traffic_multiplier = 1.0
        if vehicle_type == "fire_brigade":
            # Fire trucks get highest priority (80% traffic delay mitigation)
            traffic_multiplier = 1.0 + (traffic - 1.0) * 0.2
        elif vehicle_type == "ambulance":
            # Ambulances get high priority (70% traffic delay mitigation)
            traffic_multiplier = 1.0 + (traffic - 1.0) * 0.3
        else:
            traffic_multiplier = traffic
            
        # Travel time in minutes
        weight = (dist / speed) * 60 * traffic_multiplier
        
        adj[u].append((v, weight, dist))
        adj[v].append((u, weight, dist))

    # Priority queue: (total_time_min, current_node, path, total_dist_km)
    queue = [(0.0, start, [], 0.0)]
    visited = {}
    
    while queue:
        time_spent, curr, path, total_dist = heapq.heappop(queue)
        
        if curr in visited and visited[curr] <= time_spent:
            continue
            
        visited[curr] = time_spent
        new_path = path + [curr]
        
        if curr == end:
            # Extract coordinates for waypoints mapping
            waypoints = [[NAGPUR_NODES[node]["lat"], NAGPUR_NODES[node]["lng"]] for node in new_path]
            
            # Find signals along the route (nodes that have lights)
            signals = [node for node in new_path if NAGPUR_NODES[node]["has_light"]]
            
            return {
                "path": new_path,
                "waypoints": waypoints,
                "total_time_minutes": round(time_spent, 2),
                "total_distance_km": round(total_dist, 2),
                "signals": signals,
                "priority_applied": vehicle_type in ["ambulance", "fire_brigade"]
            }
            
        for neighbor, weight, dist in adj[curr]:
            heapq.heappush(queue, (time_spent + weight, neighbor, new_path, total_dist + dist))
            
    return None