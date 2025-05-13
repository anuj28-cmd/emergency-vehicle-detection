import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Box,
  CircularProgress,
  Card,
  CardContent,
  Tab,
  Tabs
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

// Mock data (in a real app, this would come from the API)
const mockData = {
  detectionsByType: [
    { name: 'Emergency Vehicles', value: 124 },
    { name: 'Normal Vehicles', value: 876 },
  ],
  detectionsByMonth: [
    { name: 'Jan', emergency: 10, normal: 62 },
    { name: 'Feb', emergency: 14, normal: 78 },
    { name: 'Mar', emergency: 8, normal: 84 },
    { name: 'Apr', emergency: 17, normal: 93 },
    { name: 'May', emergency: 21, normal: 105 },
    { name: 'Jun', emergency: 14, normal: 89 },
    { name: 'Jul', emergency: 11, normal: 95 },
    { name: 'Aug', emergency: 9, normal: 90 },
    { name: 'Sep', emergency: 8, normal: 78 },
    { name: 'Oct', emergency: 12, normal: 102 },
  ],
  confidenceDistribution: [
    { range: '90-100%', count: 180 },
    { range: '80-90%', count: 280 },
    { range: '70-80%', count: 240 },
    { range: '60-70%', count: 120 },
    { range: '50-60%', count: 80 },
    { range: 'Below 50%', count: 100 },
  ],
  responseTimeByVehicle: [
    { type: 'Ambulance', time: 8.2 },
    { type: 'Police Car', time: 6.5 },
    { type: 'Fire Truck', time: 9.7 },
  ],
  detectionsByLocation: [
    { name: 'Downtown', value: 245 },
    { name: 'Highway', value: 312 },
    { name: 'Suburban', value: 196 },
    { name: 'Rural', value: 87 },
    { name: 'Industrial', value: 160 },
  ],
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF5C5C'];

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    // In a real app, fetch actual statistics from the backend
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        // Simulate API call with a delay
        setTimeout(() => {
          setStats(mockData);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load statistics. Please try again later.');
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={0} sx={{ p: 3, backgroundColor: '#ffe0e0' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        System Statistics
      </Typography>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Time Analysis" />
          <Tab label="Location Data" />
          <Tab label="Detection Quality" />
        </Tabs>
        
        <Box p={3}>
          {tabValue === 0 && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Vehicle Types Detected</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.detectionsByType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.detectionsByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Detection Confidence Distribution</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.confidenceDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Number of Detections" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          
          {tabValue === 1 && (
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Monthly Detection Trends</Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={stats.detectionsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="emergency" name="Emergency Vehicles" stroke="#FF5C5C" strokeWidth={2} />
                        <Line type="monotone" dataKey="normal" name="Normal Vehicles" stroke="#0088FE" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          
          {tabValue === 2 && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Detections by Location</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.detectionsByLocation}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {stats.detectionsByLocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Response Time by Vehicle Type</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.responseTimeByVehicle}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="time" name="Average Response Time (min)" fill="#00C49F" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          
          {tabValue === 3 && (
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Detection Quality Metrics</Typography>
                    <Box mt={3} sx={{ fontStyle: 'italic' }}>
                      <Typography>
                        Model performance metrics based on the latest test data:
                      </Typography>
                      <Grid container spacing={2} mt={1}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Accuracy
                            </Typography>
                            <Typography variant="h4" color="primary">
                              96.2%
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Precision
                            </Typography>
                            <Typography variant="h4" color="primary">
                              94.5%
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              Recall
                            </Typography>
                            <Typography variant="h4" color="primary">
                              92.8%
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              F1 Score
                            </Typography>
                            <Typography variant="h4" color="primary">
                              93.6%
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
      
      <Box mt={3}>
        <Typography variant="body2" color="text.secondary">
          Note: Statistics shown are based on the last 1000 detections. Data is updated daily.
        </Typography>
      </Box>
    </Container>
  );
};

export default Statistics;