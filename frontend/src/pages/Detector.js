import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Grid, Card, CardContent, 
  IconButton, CircularProgress, Tabs, Tab, Divider, Alert,
  Snackbar, useTheme, styled, Tooltip, Fade, Chip, Slider, 
  Switch, FormControlLabel, TextField
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CameraAlt as CameraIcon,
  Videocam as VideoIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  LocationOn as LocationIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import Webcam from 'react-webcam';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Socket.io client for real-time communication
import io from 'socket.io-client';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

// Styled components
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const DetectionImage = styled('img')(({ theme }) => ({
  width: '100%',
  height: 'auto',
  borderRadius: theme.shape.borderRadius,
  border: '2px solid rgba(0, 229, 255, 0.3)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
}));

const WebcamContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  border: '2px solid rgba(0, 229, 255, 0.3)',
}));

const ControlsOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(2),
  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing(2),
  zIndex: 10,
}));

const DetectorHeading = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  marginBottom: theme.spacing(1),
  background: 'linear-gradient(to right, #00e5ff, #2196f3)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '0 0 20px rgba(0,229,255,0.3)',
}));

const DetectionCard = styled(Card)(({ theme, detected }) => ({
  transition: 'all 0.3s ease',
  transform: detected ? 'scale(1.02)' : 'scale(1)',
  boxShadow: detected ? '0 0 30px rgba(255, 61, 0, 0.4)' : '0 4px 20px 0 rgba(0,0,0,0.5)',
  border: detected ? '2px solid rgba(255, 61, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
}));

const ConfidenceBar = styled(Box)(({ theme, value, emergency }) => ({
  height: '8px',
  width: `${value}%`,
  borderRadius: '4px',
  background: emergency 
    ? `linear-gradient(to right, #ff9800, #f44336)` 
    : `linear-gradient(to right, #00bcd4, #4caf50)`,
  boxShadow: emergency 
    ? '0 0 10px rgba(255, 61, 0, 0.5)' 
    : '0 0 10px rgba(0, 229, 255, 0.5)',
}));

const SettingsPanel = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(3),
}));

export default function Detector() {
  const theme = useTheme();
  const { isAuthenticated, currentUser, token } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const socketRef = useRef(null);
  
  // State variables
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [streamMode, setStreamMode] = useState(false);
  const [streamInterval, setStreamInterval] = useState(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [showSettings, setShowSettings] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    enhanceContrast: false,
    noiseReduction: true,
    trackVehicles: true,
    showBoundingBoxes: true,
    alertSound: false
  });
  const [recentDetections, setRecentDetections] = useState([]);
  
  // Initialize socket connection for real-time features
  useEffect(() => {
    // Create socket connection
    socketRef.current = io();
    
    // Set up event listeners
    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
    });
    
    socketRef.current.on('detection_update', (data) => {
      console.log('Real-time detection update:', data);
      // Handle real-time detection updates
    });
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Clean up streaming interval if active
      if (streamInterval) {
        clearInterval(streamInterval);
      }
    };
  }, []);
  
  // Handle tab changes
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Reset detection states when switching tabs
    setDetectionResult(null);
    setFile(null);
    setFilePreview(null);
    setCameraActive(false);
    setStreamMode(false);
    
    if (streamInterval) {
      clearInterval(streamInterval);
      setStreamInterval(null);
    }
  };
  
  // Handle file upload
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      setFile(selectedFile);
      setFilePreview(reader.result);
      setDetectionResult(null);
    };
    reader.readAsDataURL(selectedFile);
  };
  
  // Handle file upload detection
  const handleDetectFromFile = async () => {
    if (!file) {
      enqueueSnackbar('Please select an image file first', { variant: 'warning' });
      return;
    }
    
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setDetectionResult(response.data);
      
      // Add to recent detections
      addToRecentDetections(response.data);
      
      // Check if green corridor was triggered
      checkEmergencyCorridor(response.data);
      
      // Show success message
      enqueueSnackbar('Detection completed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Detection error:', error);
      enqueueSnackbar('Error processing the image', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle camera
  const handleToggleCamera = () => {
    setCameraActive(!cameraActive);
    setDetectionResult(null);
    
    if (streamMode && streamInterval) {
      clearInterval(streamInterval);
      setStreamInterval(null);
      setStreamMode(false);
    }
  };
  
  // Capture image from webcam
  const handleCaptureImage = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;
      
      // Convert base64 to blob
      const byteString = atob(imageSrc.split(',')[1]);
      const mimeString = imageSrc.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      const capturedFile = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
      
      setFile(capturedFile);
      setFilePreview(imageSrc);
      
      // Auto-detect from webcam image
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', capturedFile);
      
      try {
        const response = await axios.post('/api/detect', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        setDetectionResult(response.data);
        
        // Add to recent detections
        addToRecentDetections(response.data);
        
        // Check if green corridor was triggered
        checkEmergencyCorridor(response.data);
        
        // Play alert sound if enabled and emergency vehicle detected
        if (advancedOptions.alertSound && response.data.detection_type === 'Emergency Vehicle') {
          playAlertSound();
        }
      } catch (error) {
        console.error('Detection error:', error);
        enqueueSnackbar('Error processing the camera image', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };
  
  const checkEmergencyCorridor = (data) => {
    if (data.trigger_corridor) {
      const pointName = data.start_node ? data.start_node.replace(/_/g, ' ') : 'Unknown Intersection';
      enqueueSnackbar(`Emergency vehicle detected at ${pointName}! Select a destination to enable the green corridor.`, { 
        variant: 'error',
        persist: true,
        action: (key) => (
          <Button 
            size="small" 
            style={{ color: '#00e5ff', fontWeight: 'bold' }} 
            onClick={() => {
              navigate(`/map-monitor?start=${data.start_node}`);
            }}
          >
            Select Destination
          </Button>
        )
      });
    }
  };

  // Toggle stream mode for continuous detection
  const handleToggleStream = () => {
    if (streamMode) {
      // Stop streaming
      if (streamInterval) {
        clearInterval(streamInterval);
        setStreamInterval(null);
      }
      setStreamMode(false);
      enqueueSnackbar('Stream mode disabled', { variant: 'info' });
    } else {
      // Start streaming
      if (!cameraActive) {
        setCameraActive(true);
      }
      
      setStreamMode(true);
      enqueueSnackbar('Stream mode enabled - detecting every 3 seconds', { variant: 'info' });
      
      // Set up interval for regular captures
      const interval = setInterval(() => {
        handleCaptureImage();
      }, 3000);
      
      setStreamInterval(interval);
    }
  };
  
  // Helper function to play alert sound
  const playAlertSound = () => {
    const audio = new Audio('/sounds/emergency-alert.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };
  
  // Add detection to recent list
  const addToRecentDetections = (data) => {
    setRecentDetections(prev => {
      const updated = [
        {
          id: data.detection_id,
          type: data.detection_type,
          confidence: data.confidence,
          timestamp: new Date().toISOString(),
          image: `/api/uploads/${data.processed_filename}?token=${token}`
        },
        ...prev
      ].slice(0, 5); // Keep only last 5 detections
      
      return updated;
    });
  };
  
  // Webcam access failure handler
  const handleWebcamError = (error) => {
    console.error("Webcam error:", error);
    enqueueSnackbar("Webcam access failed. Please check camera permissions.", { variant: "error" });
    setCameraActive(false);
  };

  // Save detection (Download processed image)
  const handleSaveDetection = () => {
    if (!detectionResult) return;
    const imageUrl = `/api/uploads/${detectionResult.processed_filename}?token=${token}`;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = detectionResult.processed_filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Processed image download started', { variant: 'success' });
  };

  // Share detection (Web share or clipboard)
  const handleShareDetection = () => {
    if (!detectionResult) return;
    const imageUrl = `${window.location.origin}/api/uploads/${detectionResult.processed_filename}?token=${token}`;
    if (navigator.share) {
      navigator.share({
        title: 'Emergency Vehicle Detection',
        text: `Detected ${detectionResult.detection_type} with ${detectionResult.confidence.toFixed(1)}% confidence`,
        url: imageUrl
      }).catch(err => console.log('Share failed:', err));
    } else {
      navigator.clipboard.writeText(imageUrl);
      enqueueSnackbar('Detection image link copied to clipboard!', { variant: 'info' });
    }
  };

  // Reset the detector
  const handleReset = () => {
    setFile(null);
    setFilePreview(null);
    setDetectionResult(null);
    setCameraActive(false);
    setStreamMode(false);
    
    if (streamInterval) {
      clearInterval(streamInterval);
      setStreamInterval(null);
    }
  };
  
  // Toggle settings panel
  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <Box component={motion.div} variants={fadeIn} initial="hidden" animate="visible">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <DetectorHeading variant="h3" component="h1">
            Emergency Vehicles Detector
          </DetectorHeading>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Upload an image, use your camera, or analyze video streams to identify emergency vehicles with our advanced AI model.
          </Typography>
          
          {/* Settings Panel */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              startIcon={<SettingsIcon />}
              variant="outlined"
              color="primary"
              onClick={handleToggleSettings}
            >
              {showSettings ? 'Hide Settings' : 'Show Settings'}
            </Button>
          </Box>
          
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SettingsPanel>
                <Typography variant="h6" gutterBottom>
                  Detection Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Adjust detection parameters and preferences for optimal performance.
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography id="confidence-threshold-slider" gutterBottom>
                    Confidence Threshold: {confidenceThreshold}%
                  </Typography>
                  <Slider
                    value={confidenceThreshold}
                    onChange={(e, newValue) => setConfidenceThreshold(newValue)}
                    aria-labelledby="confidence-threshold-slider"
                    valueLabelDisplay="auto"
                    step={5}
                    marks
                    min={50}
                    max={95}
                    sx={{
                      color: theme.palette.primary.main,
                      '& .MuiSlider-thumb': {
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: `0px 0px 0px 8px ${theme.palette.primary.main}30`,
                        },
                      },
                    }}
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={advancedOptions.enhanceContrast} 
                          onChange={(e) => setAdvancedOptions({
                            ...advancedOptions,
                            enhanceContrast: e.target.checked
                          })}
                          color="primary"
                        />
                      }
                      label="Enhance Image Contrast"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={advancedOptions.noiseReduction} 
                          onChange={(e) => setAdvancedOptions({
                            ...advancedOptions,
                            noiseReduction: e.target.checked
                          })}
                          color="primary"
                        />
                      }
                      label="Apply Noise Reduction"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={advancedOptions.trackVehicles} 
                          onChange={(e) => setAdvancedOptions({
                            ...advancedOptions,
                            trackVehicles: e.target.checked
                          })}
                          color="primary"
                        />
                      }
                      label="Track Vehicle Movement"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={advancedOptions.showBoundingBoxes} 
                          onChange={(e) => setAdvancedOptions({
                            ...advancedOptions,
                            showBoundingBoxes: e.target.checked
                          })}
                          color="primary"
                        />
                      }
                      label="Show Bounding Boxes"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={advancedOptions.alertSound} 
                          onChange={(e) => setAdvancedOptions({
                            ...advancedOptions,
                            alertSound: e.target.checked
                          })}
                          color="primary"
                        />
                      }
                      label="Play Alert Sound"
                    />
                  </Grid>
                </Grid>
              </SettingsPanel>
            </motion.div>
          )}
          
          {/* Tabs for different detection methods */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="detector tabs"
              textColor="primary"
              indicatorColor="primary"
              centered
              sx={{ 
                '& .MuiTab-root': { 
                  fontSize: '1rem',
                  fontWeight: 500,
                  py: 2
                } 
              }}
            >
              <Tab 
                icon={<UploadIcon />} 
                iconPosition="start" 
                label="Upload Image" 
              />
              <Tab 
                icon={<CameraIcon />} 
                iconPosition="start" 
                label="Use Camera" 
              />
              <Tab 
                icon={<VideoIcon />} 
                iconPosition="start" 
                label="Video Analysis" 
                disabled
              />
            </Tabs>
          </Box>
        </Grid>
        
        {/* Main detection area */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              {/* Upload Image Tab */}
              {activeTab === 0 && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  {filePreview ? (
                    <Box>
                      <DetectionImage 
                        src={detectionResult ? `/api/uploads/${detectionResult.processed_filename}?token=${token}` : filePreview} 
                        alt="Detection" 
                      />
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleDetectFromFile}
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                          {loading ? 'Processing...' : 'Detect Emergency Vehicles'}
                        </Button>
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={handleReset}
                          startIcon={<RefreshIcon />}
                        >
                          Reset
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      py: 10, 
                      border: '2px dashed rgba(0, 229, 255, 0.3)',
                      borderRadius: 2,
                      backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    }}>
                      <input
                        accept="image/*"
                        type="file"
                        id="upload-image"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="upload-image">
                        <Button
                          component="span"
                          variant="contained"
                          color="primary"
                          startIcon={<UploadIcon />}
                          size="large"
                          sx={{ mb: 2 }}
                        >
                          Select Image
                        </Button>
                      </label>
                      <Typography variant="body2" color="text.secondary">
                        Supported formats: JPG, PNG, JPEG
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Camera Tab */}
              {activeTab === 1 && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  {cameraActive ? (
                    <WebcamContainer>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        width="100%"
                        videoConstraints={{ facingMode: "environment" }}
                        onUserMediaError={handleWebcamError}
                      />
                      <ControlsOverlay>
                        <Tooltip title={streamMode ? "Stop Stream" : "Start Continuous Detection"}>
                          <IconButton 
                            color={streamMode ? "secondary" : "primary"}
                            onClick={handleToggleStream}
                          >
                            <VideoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Capture Image">
                          <IconButton 
                            color="primary" 
                            onClick={handleCaptureImage}
                            disabled={streamMode || loading}
                          >
                            <CameraIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Turn Off Camera">
                          <IconButton 
                            color="default" 
                            onClick={handleToggleCamera}
                          >
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      </ControlsOverlay>
                      
                      {loading && (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          right: 0, 
                          bottom: 0, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          zIndex: 5
                        }}>
                          <CircularProgress color="primary" size={60} />
                        </Box>
                      )}
                      
                      {streamMode && (
                        <Chip
                          label="LIVE DETECTION"
                          color="secondary"
                          sx={{ 
                            position: 'absolute', 
                            top: 16, 
                            right: 16,
                            fontWeight: 'bold',
                            animation: 'pulse 2s infinite'
                          }}
                        />
                      )}
                    </WebcamContainer>
                  ) : filePreview && detectionResult ? (
                    <Box>
                      <DetectionImage 
                        src={`/api/uploads/${detectionResult.processed_filename}?token=${token}`} 
                        alt="Detection Result" 
                      />
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleToggleCamera}
                          startIcon={<CameraIcon />}
                        >
                          Back to Camera
                        </Button>
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={handleReset}
                          startIcon={<RefreshIcon />}
                        >
                          Reset
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      py: 10, 
                      border: '2px dashed rgba(0, 229, 255, 0.3)',
                      borderRadius: 2,
                      backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CameraIcon />}
                        size="large"
                        onClick={handleToggleCamera}
                        sx={{ mb: 2 }}
                      >
                        Enable Camera
                      </Button>
                      <Typography variant="body2" color="text.secondary">
                        Use your camera to detect emergency vehicles in real-time
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Video Analysis Tab - Coming Soon */}
              {activeTab === 2 && (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    Coming Soon
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Video analysis features will be available in a future update.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Results and Info Panel */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3} direction="column" sx={{ height: '100%' }}>
            {/* Detection Results Card */}
            <Grid item xs>
              <DetectionCard detected={detectionResult?.detection_type === 'Emergency Vehicle'}>
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    Detection Results
                  </Typography>
                  
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                      <CircularProgress />
                    </Box>
                  ) : detectionResult ? (
                    <Box>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 2
                      }}>
                        <Typography variant="h5" component="p" sx={{ 
                          fontWeight: 600,
                          color: detectionResult.detection_type === 'Emergency Vehicle' ? 
                            'secondary.main' : 'primary.main'
                        }}>
                          {detectionResult.detection_type}
                        </Typography>
                        
                        {detectionResult.detection_type === 'Emergency Vehicle' && (
                          <Chip 
                            icon={<WarningIcon />} 
                            label="EMERGENCY" 
                            color="secondary"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                          />
                        )}
                      </Box>
                      
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Confidence
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {(detectionResult.confidence ).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: '100%', 
                          backgroundColor: 'background.default',
                          borderRadius: '4px',
                          padding: '2px'
                        }}>
                          <ConfidenceBar 
                            value={detectionResult.confidence} 
                            emergency={detectionResult.detection_type === 'Emergency Vehicle'} 
                          />
                        </Box>
                      </Box>
                      
                      {detectionResult.detection_type === 'Emergency Vehicle' && (
                        <Alert 
                          severity="warning" 
                          sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}
                        >
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Emergency vehicle detected with high confidence
                          </Typography>
                          <Typography variant="body2">
                            Consider giving priority to this vehicle if encountered on the road.
                          </Typography>
                        </Alert>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          startIcon={<SaveIcon />}
                          variant="outlined"
                          size="small"
                          onClick={handleSaveDetection}
                        >
                          Save
                        </Button>
                        <Button
                          startIcon={<ShareIcon />}
                          variant="outlined"
                          size="small"
                          onClick={handleShareDetection}
                        >
                          Share
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                      <InfoIcon color="disabled" sx={{ fontSize: 40, opacity: 0.7, mb: 1 }} />
                      <Typography color="text.secondary">
                        Upload an image or use your camera to start detection
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </DetectionCard>
            </Grid>
            
            {/* Recent Detections */}
            {isAuthenticated && (
              <Grid item xs>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      Recent Detections
                    </Typography>
                    
                    {recentDetections.length > 0 ? (
                      <Box>
                        {recentDetections.map((detection, index) => (
                          <Box key={detection.id || index} sx={{ mb: 2, pb: 2, borderBottom: index < recentDetections.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={4}>
                                <Box 
                                  component="img" 
                                  src={detection.image} 
                                  alt={detection.type}
                                  sx={{ 
                                    width: '100%', 
                                    height: 60, 
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    border: detection.type === 'Emergency Vehicle' ? 
                                      '2px solid rgba(255, 61, 0, 0.5)' : 
                                      '2px solid rgba(0, 229, 255, 0.3)',
                                  }}
                                />
                              </Grid>
                              <Grid item xs={8}>
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600,
                                  color: detection.type === 'Emergency Vehicle' ? 
                                    'secondary.light' : 'primary.light'
                                }}>
                                  {detection.type}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Confidence: {(detection.confidence).toFixed(1)}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(detection.timestamp).toLocaleTimeString()}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Box sx={{ py: 2, textAlign: 'center' }}>
                        <Typography color="text.secondary" variant="body2">
                          No recent detections
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}