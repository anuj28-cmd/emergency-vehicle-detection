import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Box, Typography, Button, Paper, Grid, Card, CardContent, 
  CircularProgress, Select, MenuItem, InputLabel, FormControl, 
  List, ListItem, ListItemText, Chip, Alert, Divider, TextField,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  Speed as SpeedIcon,
  LocationOn as LocationIcon,
  Traffic as TrafficIcon
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon bugs in Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

// Helper component to center/fly map to route bounds
function MapViewUpdater({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

// Custom DivIcons for visual aesthetics
const getIntersectionIcon = (name, isDestination = false) => {
  if (isDestination) {
    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: `<div style="background-color: #e91e63; width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 15px #e91e63; display: flex; align-items: center; justify-content: center; animation: marker-pulse 1.5s infinite;"><span style="font-size: 14px;">🏥</span></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: #00e5ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px #00e5ff;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

const getSignalIcon = (status, isRouteSignal = false) => {
  const color = status === 'green' ? '#00e676' : '#ff1744';
  const anim = status === 'green' ? 'animation: marker-pulse 1s infinite;' : '';
  const shadow = isRouteSignal ? `box-shadow: 0 0 15px ${color}, inset 0 0 5px rgba(255,255,255,0.6);` : `box-shadow: 0 0 8px ${color};`;
  const border = isRouteSignal ? 'border: 2px solid #ffffff;' : 'border: 2.5px solid #12213a;';
  const size = isRouteSignal ? 16 : 12;
  const half = size / 2;
  
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; ${border} ${shadow} ${anim}"></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half]
  });
};

const getAmbulanceIcon = (type) => {
  const isFire = type === 'fire_brigade';
  const emoji = isFire ? '🚒' : '🚑';
  const color = isFire ? '#ff9800' : '#ff3d00';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="ambulance-marker" style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 20px ${color}; display: flex; align-items: center; justify-content: center; animation: marker-pulse 0.5s infinite;"><span style="font-size: 15px; margin-top: -2px;">${emoji}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

export default function MapMonitor() {
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { isAuthenticated } = useAuth();
  
  const [network, setNetwork] = useState({ nodes: {}, edges: [] });
  const [startNode, setStartNode] = useState('Sitabuldi');
  const [endNode, setEndNode] = useState('AIIMS Nagpur');
  const [vehicleNo, setVehicleNo] = useState('MH-31-EV-2026');
  const [vehicleType, setVehicleType] = useState('ambulance');
  const [promptOpen, setPromptOpen] = useState(false);
  
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  
  // Telemetry variables
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [currentEta, setCurrentEta] = useState(0);
  const [currentDist, setCurrentDist] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(65);
  const [activeSignals, setActiveSignals] = useState({});
  const [simLogs, setSimLogs] = useState([]);
  
  const simIntervalRef = useRef(null);
  const mapCenter = [21.10, 79.05]; // Nagpur Center
  const mapZoom = 12;

  // Fetch Nagpur road network on mount
  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/map/network');
        setNetwork(response.data);
        
        // Auto-select starting node if query parameter exists from EVDetections
        const params = new URLSearchParams(location.search);
        const startParam = params.get('start');
        if (startParam && response.data.nodes[startParam]) {
          setStartNode(startParam);
          setEndNode('AIIMS Nagpur');
          setVehicleType('ambulance');
          setPromptOpen(true);
        }
      } catch (err) {
        console.error('Error fetching map network:', err);
        enqueueSnackbar('Failed to load Nagpur map data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchNetwork();
    
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [location]);

  // Log message helper
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setSimLogs(prev => [{ time: timestamp, msg: message }, ...prev]);
  };

  // Run Dijkstra route optimization
  const fetchRoute = async (start, end, type) => {
    try {
      const response = await axios.get(`/api/map/route?start=${start}&end=${end}&vehicle_type=${type}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching route:', err);
      enqueueSnackbar('Failed to optimize route', { variant: 'error' });
      return null;
    }
  };

  // Trigger simulation
  const triggerSimulation = async (start, end, type, number) => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setSimulating(true);
    setSimLogs([]);
    
    const vehicleLabel = type === 'fire_brigade' ? 'Fire Brigade' : 'Ambulance';
    addLog(`Registration: Registered ${vehicleLabel} No. ${number} for corridor passage.`);
    addLog(`System Notification: Initiating Green Corridor from ${start} to ${end}.`);
    
    const route = await fetchRoute(start, end, type);
    if (!route) {
      setSimulating(false);
      return;
    }
    
    setRouteInfo(route);
    setAmbulancePos(route.waypoints[0]);
    setCurrentEta(route.total_time_minutes);
    setCurrentDist(route.total_distance_km);
    setCurrentSpeed(type === 'fire_brigade' ? 55 : 65);
    
    // Set all network signals to standard Red
    const initialSignals = {};
    Object.keys(network.nodes).forEach(node => {
      if (network.nodes[node].has_light) {
        initialSignals[node] = 'red';
      }
    });
    
    // Switch the initial route signal to green
    if (route.signals.includes(start)) {
      initialSignals[start] = 'green';
    }
    setActiveSignals(initialSignals);
    
    addLog(`Route Optimizer: Shortest path computed: ${route.path.join(' ➔ ')}`);
    addLog(`Smart Traffic: Green Corridor initiated. Priority ETA: ${route.total_time_minutes} mins.`);
    enqueueSnackbar('Green Corridor Active! Route signals synchronized.', { variant: 'success' });

    let step = 0;
    const pathNodes = route.path;
    const pathWaypoints = route.waypoints;
    
    simIntervalRef.current = setInterval(() => {
      step++;
      if (step >= pathWaypoints.length) {
        // Vehicle arrived at Destination
        clearInterval(simIntervalRef.current);
        setSimulating(false);
        setAmbulancePos(pathWaypoints[pathWaypoints.length - 1]);
        setCurrentEta(0);
        setCurrentDist(0);
        setCurrentSpeed(0);
        
        addLog(`Arrived: Vehicle ${number} has safely arrived at ${end}.`);
        addLog(`Green Corridor simulation completed. Corridor reset to standard operation.`);
        enqueueSnackbar(`${vehicleLabel} (${number}) safely arrived at destination!`, { variant: 'success' });
        return;
      }
      
      const currentNode = pathNodes[step];
      const previousNode = pathNodes[step - 1];
      
      // Update position
      setAmbulancePos(pathWaypoints[step]);
      
      // Calculate remaining stats
      const completionRatio = step / (pathWaypoints.length - 1);
      const remainingDistance = Math.max(0, route.total_distance_km * (1 - completionRatio));
      const remainingEta = Math.max(0, route.total_time_minutes * (1 - completionRatio));
      
      setCurrentDist(remainingDistance);
      setCurrentEta(remainingEta);
      
      // Speed adjustments depending on type
      const baseSpeed = type === 'fire_brigade' ? 55 : 62;
      setCurrentSpeed(Math.floor(baseSpeed + Math.random() * 10));
      
      // Update Traffic Light Coordination (Green Corridor effect)
      // Turn passed node to RED, upcoming to GREEN
      setActiveSignals(prev => {
        const nextSignals = { ...prev };
        if (network.nodes[previousNode]?.has_light) {
          nextSignals[previousNode] = 'red';
        }
        if (network.nodes[currentNode]?.has_light) {
          nextSignals[currentNode] = 'green';
        }
        return nextSignals;
      });
      
      addLog(`Progress: Passing ${previousNode}, approaching ${currentNode}.`);
      if (network.nodes[currentNode]?.has_light) {
        addLog(`Smart Traffic: Signal at ${currentNode} switched to emergency GREEN corridor.`);
      }
      
    }, 2000);
  };

  const handleStartSimulation = () => {
    if (!startNode || !endNode) return;
    triggerSimulation(startNode, endNode, vehicleType, vehicleNo);
  };

  const handleStopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    setSimulating(false);
    setRouteInfo(null);
    setAmbulancePos(null);
    addLog(`Simulation paused by user.`);
  };

  // Get bounds for Leaflet auto-fit
  const getRouteBounds = () => {
    if (!routeInfo || !routeInfo.waypoints) return null;
    return routeInfo.waypoints;
  };

  return (
    <Box sx={{ flexGrow: 1, py: 1 }}>
      <style>{`
        @keyframes marker-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .leaflet-container {
          width: 100%;
          height: 100%;
          border-radius: 8px;
        }
        .leaflet-tooltip {
          background-color: #12213a !important;
          border: 1px solid rgba(0, 229, 255, 0.5) !important;
          color: #ffffff !important;
          font-family: 'Outfit', sans-serif !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
          border-radius: 6px !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: rgba(0, 229, 255, 0.5) !important;
        }
      `}</style>
      
      <Grid container spacing={3}>
        {/* Left Side: Controls & Telemetry */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            
            {/* Control Panel Card */}
            <Grid item xs={12}>
              <Card elevation={3} sx={{ border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                    Green Corridor Control
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Register an emergency vehicle, choose source and destination nodes, and calculate the dynamic fastest corridor.
                  </Typography>

                  {/* Vehicle Registration Section */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <TextField
                        label="Vehicle Number"
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        disabled={simulating}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="vehicle-type-label">Vehicle Type</InputLabel>
                        <Select
                          labelId="vehicle-type-label"
                          value={vehicleType}
                          label="Vehicle Type"
                          onChange={(e) => setVehicleType(e.target.value)}
                          disabled={simulating}
                        >
                          <MenuItem value="ambulance">🚑 Ambulance</MenuItem>
                          <MenuItem value="fire_brigade">🚒 Fire Brigade</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  
                  {/* Route Source & Destination */}
                  <FormControl fullWidth sx={{ mb: 2 }} size="small">
                    <InputLabel id="start-node-label">Select Starting Point</InputLabel>
                    <Select
                      labelId="start-node-label"
                      value={startNode}
                      label="Select Starting Point"
                      onChange={(e) => setStartNode(e.target.value)}
                      disabled={simulating}
                    >
                      {Object.keys(network.nodes).map((nodeName) => (
                        <MenuItem key={nodeName} value={nodeName} disabled={nodeName === endNode}>
                          {network.nodes[nodeName].name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 3 }} size="small">
                    <InputLabel id="end-node-label">Select Destination</InputLabel>
                    <Select
                      labelId="end-node-label"
                      value={endNode}
                      label="Select Destination"
                      onChange={(e) => setEndNode(e.target.value)}
                      disabled={simulating}
                    >
                      {Object.keys(network.nodes).map((nodeName) => (
                        <MenuItem key={nodeName} value={nodeName} disabled={nodeName === startNode}>
                          {network.nodes[nodeName].name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Box display="flex" gap={2}>
                    {!simulating ? (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<PlayIcon />}
                        onClick={handleStartSimulation}
                        disabled={loading || !startNode || !endNode}
                        fullWidth
                      >
                        Start Corridor
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<StopIcon />}
                        onClick={handleStopSimulation}
                        fullWidth
                      >
                        Stop Simulation
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<RefreshIcon />}
                      onClick={() => {
                        setStartNode('Sitabuldi');
                        setEndNode('AIIMS Nagpur');
                        setVehicleNo('MH-31-EV-2026');
                        setVehicleType('ambulance');
                      }}
                      disabled={simulating}
                    >
                      Reset
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Telemetry Display */}
            {routeInfo && (
              <Grid item xs={12}>
                <Card elevation={3} sx={{ background: 'linear-gradient(145deg, #12213a, #0a1929)', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" color="secondary" sx={{ fontWeight: 600 }}>
                        Live Telemetry
                      </Typography>
                      <Chip 
                        label={simulating ? "EN ROUTE" : "ARRIVED"} 
                        color={simulating ? "warning" : "success"}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <TimeIcon color="info" sx={{ mb: 0.5 }} />
                          <Typography variant="caption" display="block" color="text.secondary">PRIORITY ETA</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{currentEta.toFixed(1)} mins</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <LocationIcon color="info" sx={{ mb: 0.5 }} />
                          <Typography variant="caption" display="block" color="text.secondary">REMAINING</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{currentDist.toFixed(2)} km</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <SpeedIcon color="info" sx={{ mb: 0.5 }} />
                          <Typography variant="caption" display="block" color="text.secondary">VELOCITY</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{currentSpeed} km/h</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <TrafficIcon color="info" sx={{ mb: 0.5 }} />
                          <Typography variant="caption" display="block" color="text.secondary">ROUTE SIGNALS</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {routeInfo.signals.length} Synced
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Sim Logs Panel */}
            <Grid item xs={12}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    System Event Logs
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      maxHeight: 180, 
                      overflowY: 'auto', 
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      fontFamily: 'monospace',
                      fontSize: '11.5px'
                    }}
                  >
                    {simLogs.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No active simulation. Trigger a green corridor to view logs.
                      </Typography>
                    ) : (
                      <List dense disablePadding>
                        {simLogs.map((log, index) => (
                          <ListItem key={index} disableGutters sx={{ py: 0.25 }}>
                            <ListItemText 
                              primary={
                                <span>
                                  <span style={{ color: '#00e5ff', marginRight: '6px' }}>[{log.time}]</span>
                                  <span style={{ color: '#ffffff' }}>{log.msg}</span>
                                </span>
                              } 
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
            
          </Grid>
        </Grid>

        {/* Right Side: Map Canvas */}
        <Grid item xs={12} md={8}>
          <Card elevation={3} sx={{ height: '620px', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Nagpur Intelligent Map Monitor
              </Typography>
              <Chip 
                label="Nagpur Urban Grid" 
                size="small" 
                variant="outlined" 
                color="primary" 
              />
            </Box>
            <Divider />
            <Box sx={{ flexGrow: 1, p: 1, position: 'relative' }}>
              {loading && (
                <Box 
                  sx={{ 
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    backgroundColor: 'rgba(10, 25, 41, 0.7)', zIndex: 1000,
                    borderRadius: '8px'
                  }}
                >
                  <CircularProgress color="primary" />
                </Box>
              )}
              
              <MapContainer 
                center={mapCenter} 
                zoom={mapZoom} 
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                
                <MapViewUpdater 
                  center={mapCenter} 
                  zoom={mapZoom} 
                  bounds={getRouteBounds()} 
                />

                {/* Render All Nagpur Network Nodes & Intersections */}
                {Object.keys(network.nodes).map((nodeName) => {
                  const node = network.nodes[nodeName];
                  const isDestination = nodeName === endNode;
                  
                  // Render traffic lights
                  if (node.has_light) {
                    const signalStatus = activeSignals[nodeName] || 'red';
                    const isRouteSignal = routeInfo ? routeInfo.signals.includes(nodeName) : false;
                    
                    return (
                      <Marker 
                        key={nodeName}
                        position={[node.lat, node.lng]}
                        icon={getSignalIcon(signalStatus, isRouteSignal)}
                      >
                        <LeafletTooltip direction="top" offset={[0, -10]} opacity={0.95}>
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.light' }}>
                              {node.name}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Type: Synced Traffic Intersection
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              Signal Status: <span style={{ color: signalStatus === 'green' ? '#00e676' : '#ff1744', fontWeight: 'bold' }}>
                                {signalStatus.toUpperCase()} {isRouteSignal && '(CORRIDOR OVERRIDE ACTIVE)'}
                              </span>
                            </Typography>
                          </Box>
                        </LeafletTooltip>
                      </Marker>
                    );
                  }
                  
                  return (
                    <Marker
                      key={nodeName}
                      position={[node.lat, node.lng]}
                      icon={getIntersectionIcon(nodeName, isDestination)}
                    >
                      <LeafletTooltip direction="top" offset={[0, -10]} opacity={0.95}>
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{node.name}</Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {isDestination ? 'Destination Corridor Target' : 'Standard Grid Node'}
                          </Typography>
                        </Box>
                      </LeafletTooltip>
                    </Marker>
                  );
                })}

                {/* Draw Route Connections (Gray Network Grid Lines) */}
                {network.edges.map((edge, index) => {
                  const uNode = network.nodes[edge.u];
                  const vNode = network.nodes[edge.v];
                  if (!uNode || !vNode) return null;
                  
                  return (
                    <Polyline 
                      key={`edge-${index}`}
                      positions={[[uNode.lat, uNode.lng], [vNode.lat, vNode.lng]]}
                      color="rgba(255, 255, 255, 0.15)"
                      weight={2}
                    />
                  );
                })}

                {/* Draw the Optimized Green Corridor Path */}
                {routeInfo && routeInfo.waypoints && (
                  <Polyline 
                    positions={routeInfo.waypoints}
                    color="#00e676"
                    weight={5}
                    opacity={0.8}
                    dashArray={simulating ? "10, 10" : "none"}
                  />
                )}

                {/* Render the Active Ambulance/Fire Truck Position */}
                {ambulancePos && (
                  <Marker 
                    position={ambulancePos}
                    icon={getAmbulanceIcon(vehicleType)}
                  >
                    <LeafletTooltip direction="top" offset={[0, -15]} opacity={0.95}>
                      <Box sx={{ p: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                          {vehicleType === 'fire_brigade' ? '🚒 Fire Brigade Telemetry' : '🚑 Ambulance Telemetry'}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                          Registration: {vehicleNo}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Speed: {currentSpeed} km/h | ETA: {currentEta.toFixed(1)}m
                        </Typography>
                      </Box>
                    </LeafletTooltip>
                  </Marker>
                )}
              </MapContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Emergency vehicle detection prompt modal */}
      <Dialog
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#12213a',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            color: '#ffffff',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, color: '#ff3d00' }}>
          🚨 Emergency Vehicle Detection Alert!
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            An emergency vehicle has been classified at <strong>{startNode ? (network.nodes[startNode]?.name || startNode) : 'a traffic signal'}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            To activate the dynamic Green Corridor, please select a destination and click "Enable Corridor" below.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Registered Vehicle No."
                variant="outlined"
                size="small"
                fullWidth
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                sx={{ input: { color: 'white' }, label: { color: '#00e5ff' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="prompt-vehicle-type-label" sx={{ color: '#00e5ff' }}>Vehicle Type</InputLabel>
                <Select
                  labelId="prompt-vehicle-type-label"
                  value={vehicleType}
                  label="Vehicle Type"
                  onChange={(e) => setVehicleType(e.target.value)}
                  sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  <MenuItem value="ambulance">🚑 Ambulance</MenuItem>
                  <MenuItem value="fire_brigade">🚒 Fire Brigade</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Spotted Intersection"
                variant="outlined"
                size="small"
                fullWidth
                value={startNode ? (network.nodes[startNode]?.name || startNode) : ''}
                disabled
                sx={{ input: { color: 'rgba(255,255,255,0.6)' }, label: { color: '#00e5ff' } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="prompt-end-node-label" sx={{ color: '#00e5ff' }}>Choose Destination</InputLabel>
                <Select
                  labelId="prompt-end-node-label"
                  value={endNode}
                  label="Choose Destination"
                  onChange={(e) => setEndNode(e.target.value)}
                  sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  {Object.keys(network.nodes).map((nodeName) => (
                    <MenuItem key={nodeName} value={nodeName} disabled={nodeName === startNode}>
                      {network.nodes[nodeName].name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            onClick={() => setPromptOpen(false)}
            sx={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)', '&:hover': { borderColor: '#ffffff' } }}
          >
            Dismiss
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              setPromptOpen(false);
              triggerSimulation(startNode, endNode, vehicleType, vehicleNo);
            }}
            disabled={!endNode || endNode === startNode}
          >
            Enable Corridor
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
