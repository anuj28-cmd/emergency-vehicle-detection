import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Slider,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { currentUser } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // System settings
  const [systemSettings, setSystemSettings] = useState({
    detectionConfidenceThreshold: 70,
    enableNotifications: true,
    notifyEmergencyServices: true,
    trafficSystemIntegration: true,
    retentionPeriod: 30,
    apiEndpoint: 'http://localhost:5000',
    modelVersion: 'emergency_vehicle_model_final.h5'
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    emailRecipients: 'admin@example.com',
    smsNotifications: false,
    smsRecipients: '',
    notificationFrequency: 'immediate'
  });

  const handleSystemSettingChange = (setting, value) => {
    setSystemSettings({
      ...systemSettings,
      [setting]: value
    });
  };

  const handleNotificationSettingChange = (setting, value) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]: value
    });
  };

  const saveSystemSettings = () => {
    // In a real app, this would send the settings to the backend
    console.log('Saving system settings:', systemSettings);
    setSuccess(true);
    // Simulate API call
    setTimeout(() => setSuccess(false), 3000);
  };

  const saveNotificationSettings = () => {
    // In a real app, this would send the settings to the backend
    console.log('Saving notification settings:', notificationSettings);
    setSuccess(true);
    // Simulate API call
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        System Settings
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Configure the emergency vehicle detection system settings. These settings are only accessible to administrators.
      </Typography>

      <Snackbar 
        open={success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Settings saved successfully!
        </Alert>
      </Snackbar>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Detection Settings */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Detection Configuration
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Detection Confidence Threshold
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={systemSettings.detectionConfidenceThreshold}
                onChange={(e, newValue) => handleSystemSettingChange('detectionConfidenceThreshold', newValue)}
                aria-labelledby="detection-threshold-slider"
                valueLabelDisplay="auto"
                step={5}
                marks
                min={40}
                max={95}
              />
              <Typography variant="body2" width={50}>
                {systemSettings.detectionConfidenceThreshold}%
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="model-version-label">Model Version</InputLabel>
              <Select
                labelId="model-version-label"
                id="model-version"
                value={systemSettings.modelVersion}
                label="Model Version"
                onChange={(e) => handleSystemSettingChange('modelVersion', e.target.value)}
              >
                <MenuItem value="emergency_vehicle_model.h5">Version 1.0 (Base)</MenuItem>
                <MenuItem value="emergency_vehicle_model_final.h5">Version 2.0 (Enhanced)</MenuItem>
                <MenuItem value="ambulance_model.h5">Ambulance Specific Model</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="API Endpoint"
              value={systemSettings.apiEndpoint}
              onChange={(e) => handleSystemSettingChange('apiEndpoint', e.target.value)}
              margin="normal"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Data Retention Period"
              type="number"
              value={systemSettings.retentionPeriod}
              onChange={(e) => handleSystemSettingChange('retentionPeriod', parseInt(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">days</InputAdornment>,
              }}
              margin="normal"
            />
          </Grid>
        </Grid>

        <Box mt={3}>
          <Button variant="contained" onClick={saveSystemSettings}>
            Save Detection Settings
          </Button>
        </Box>
      </Paper>

      {/* Integration Settings */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Integration Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Emergency Services
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.notifyEmergencyServices}
                      onChange={(e) => handleSystemSettingChange('notifyEmergencyServices', e.target.checked)}
                    />
                  }
                  label="Notify Emergency Services"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Automatically notify emergency services when emergency vehicles are detected with high confidence.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Traffic System
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.trafficSystemIntegration}
                      onChange={(e) => handleSystemSettingChange('trafficSystemIntegration', e.target.checked)}
                    />
                  }
                  label="Traffic Light Integration"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Optimize traffic lights when emergency vehicles are detected to facilitate faster passage.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notifications
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.enableNotifications}
                      onChange={(e) => handleSystemSettingChange('enableNotifications', e.target.checked)}
                    />
                  }
                  label="System Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Send notifications to administrators when emergency vehicles are detected.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Notification Settings */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notification Configuration
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onChange={(e) => handleNotificationSettingChange('emailNotifications', e.target.checked)}
                />
              }
              label="Email Notifications"
            />
            {notificationSettings.emailNotifications && (
              <TextField
                fullWidth
                label="Email Recipients"
                value={notificationSettings.emailRecipients}
                onChange={(e) => handleNotificationSettingChange('emailRecipients', e.target.value)}
                helperText="Separate multiple emails with commas"
                margin="normal"
              />
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.smsNotifications}
                  onChange={(e) => handleNotificationSettingChange('smsNotifications', e.target.checked)}
                />
              }
              label="SMS Notifications"
            />
            {notificationSettings.smsNotifications && (
              <TextField
                fullWidth
                label="Phone Numbers"
                value={notificationSettings.smsRecipients}
                onChange={(e) => handleNotificationSettingChange('smsRecipients', e.target.value)}
                helperText="Separate multiple numbers with commas"
                margin="normal"
              />
            )}
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="notification-frequency-label">Notification Frequency</InputLabel>
              <Select
                labelId="notification-frequency-label"
                id="notification-frequency"
                value={notificationSettings.notificationFrequency}
                label="Notification Frequency"
                onChange={(e) => handleNotificationSettingChange('notificationFrequency', e.target.value)}
              >
                <MenuItem value="immediate">Immediate (Every Detection)</MenuItem>
                <MenuItem value="hourly">Hourly Summary</MenuItem>
                <MenuItem value="daily">Daily Summary</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box mt={3}>
          <Button variant="contained" onClick={saveNotificationSettings}>
            Save Notification Settings
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;