import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, Grid, Paper, Card, CardContent, 
  Divider, ButtonGroup, Button, CircularProgress, useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  Insights as InsightsIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as AlertIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// Statistic Card Component
const StatCard = ({ icon, title, value, color, percentage, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)',
        background: 'rgba(19, 47, 76, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: 4,
          backgroundColor: color,
        }}
      />
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            backgroundColor: `${color}22`, 
            borderRadius: '50%', 
            p: 1, 
            display: 'flex',
            mr: 2 
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Typography 
            variant="body2" 
            color={percentage >= 0 ? "success.main" : "error.main"}
            sx={{ mr: 1 }}
          >
            {percentage >= 0 ? '+' : ''}{percentage}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  </motion.div>
);

// Dashboard Component
const Dashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week'); // week, month, year
  const [detections, setDetections] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    emergency: 0,
    today: 0,
    accuracy: 0,
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // In a real application, these would be API calls
        // For now, we'll use mock data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock detection data
        const mockDetections = generateMockData(timeframe);
        setDetections(mockDetections);
        
        // Mock stats
        setStats({
          total: 284,
          emergency: 94,
          today: 12,
          accuracy: 96.7,
        });
        
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [timeframe]);

  // Generate mock data based on timeframe
  const generateMockData = (timeframe) => {
    let data = [];
    
    switch(timeframe) {
      case 'week':
        data = [
          { name: 'Mon', emergency: 4, normal: 7, total: 11 },
          { name: 'Tue', emergency: 3, normal: 9, total: 12 },
          { name: 'Wed', emergency: 5, normal: 8, total: 13 },
          { name: 'Thu', emergency: 2, normal: 6, total: 8 },
          { name: 'Fri', emergency: 4, normal: 11, total: 15 },
          { name: 'Sat', emergency: 7, normal: 14, total: 21 },
          { name: 'Sun', emergency: 6, normal: 12, total: 18 },
        ];
        break;
      case 'month':
        data = Array.from({ length: 4 }, (_, i) => ({
          name: `Week ${i + 1}`,
          emergency: Math.floor(Math.random() * 20) + 10,
          normal: Math.floor(Math.random() * 30) + 20,
          get total() { return this.emergency + this.normal; }
        }));
        break;
      case 'year':
        data = [
          { name: 'Jan', emergency: 14, normal: 25, total: 39 },
          { name: 'Feb', emergency: 12, normal: 23, total: 35 },
          { name: 'Mar', emergency: 15, normal: 28, total: 43 },
          { name: 'Apr', emergency: 10, normal: 22, total: 32 },
          { name: 'May', emergency: 9, normal: 19, total: 28 },
          { name: 'Jun', emergency: 17, normal: 31, total: 48 },
          { name: 'Jul', emergency: 19, normal: 35, total: 54 },
          { name: 'Aug', emergency: 13, normal: 30, total: 43 },
          { name: 'Sep', emergency: 11, normal: 27, total: 38 },
          { name: 'Oct', emergency: 14, normal: 29, total: 43 },
          { name: 'Nov', emergency: 15, normal: 32, total: 47 },
          { name: 'Dec', emergency: 18, normal: 36, total: 54 },
        ];
        break;
      default:
        data = [];
    }
    
    return data;
  };

  // Calculate percentages for emergency vs normal vehicles
  const pieData = [
    { name: 'Emergency Vehicles', value: stats.emergency },
    { name: 'Normal Vehicles', value: stats.total - stats.emergency },
  ];
  
  const COLORS = ['#f50057', '#3f51b5'];

  // Accuracy over time mock data
  const accuracyData = [
    { name: 'Week 1', accuracy: 92 },
    { name: 'Week 2', accuracy: 94 },
    { name: 'Week 3', accuracy: 93 },
    { name: 'Week 4', accuracy: 95 },
    { name: 'Week 5', accuracy: 97 },
  ];

  return (
    <Container maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              mb: 1,
              fontWeight: 700,
              background: 'linear-gradient(45deg, #3f51b5 30%, #f50057 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Dashboard
          </Typography>
          
          <Typography
            variant="h5"
            color="text.secondary"
            gutterBottom
          >
            Welcome back, {user?.username || 'User'}! Here's your detection analytics.
          </Typography>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <>
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<InsightsIcon sx={{ color: '#3f51b5' }} />}
                  title="Total Detections"
                  value={stats.total}
                  color="#3f51b5"
                  percentage={12.7}
                  subtitle="vs. previous period"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<AlertIcon sx={{ color: '#f50057' }} />}
                  title="Emergency Vehicles"
                  value={stats.emergency}
                  color="#f50057"
                  percentage={8.2}
                  subtitle="vs. previous period"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<TrendingUpIcon sx={{ color: '#4caf50' }} />}
                  title="Today's Detections"
                  value={stats.today}
                  color="#4caf50"
                  percentage={23.1}
                  subtitle="vs. yesterday"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={<SuccessIcon sx={{ color: '#ff9800' }} />}
                  title="Accuracy Rate"
                  value={`${stats.accuracy}%`}
                  color="#ff9800"
                  percentage={1.4}
                  subtitle="vs. previous period"
                />
              </Grid>
            </Grid>
            
            {/* Charts */}
            <Grid container spacing={4}>
              {/* Detection Trends Chart */}
              <Grid item xs={12} lg={8}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(19, 47, 76, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Detection Trends
                  </Typography>
                  
                  <ButtonGroup 
                    size="small" 
                    sx={{ mb: 3 }}
                    variant="outlined"
                  >
                    <Button 
                      onClick={() => setTimeframe('week')}
                      variant={timeframe === 'week' ? 'contained' : 'outlined'}
                    >
                      Week
                    </Button>
                    <Button 
                      onClick={() => setTimeframe('month')}
                      variant={timeframe === 'month' ? 'contained' : 'outlined'}
                    >
                      Month
                    </Button>
                    <Button 
                      onClick={() => setTimeframe('year')}
                      variant={timeframe === 'year' ? 'contained' : 'outlined'}
                    >
                      Year
                    </Button>
                  </ButtonGroup>
                  
                  <Box sx={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={detections}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="name" 
                          stroke="rgba(255,255,255,0.7)"
                        />
                        <YAxis 
                          stroke="rgba(255,255,255,0.7)"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#132f4c', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff'
                          }} 
                        />
                        <Legend />
                        <Bar 
                          dataKey="emergency" 
                          name="Emergency Vehicles" 
                          fill="#f50057" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="normal" 
                          name="Normal Vehicles" 
                          fill="#3f51b5" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
              
              {/* Detection Distribution */}
              <Grid item xs={12} sm={6} lg={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(19, 47, 76, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Vehicle Type Distribution
                  </Typography>
                  
                  <Box sx={{ height: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(1)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#132f4c', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 2 }}>
                      {pieData.map((entry, index) => (
                        <Box key={`legend-${index}`} sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              backgroundColor: COLORS[index],
                              borderRadius: '50%',
                              mr: 1
                            }} 
                          />
                          <Typography variant="body2" color="text.secondary">
                            {entry.name}: {entry.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              {/* Detection Accuracy Trend */}
              <Grid item xs={12} sm={6} lg={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(19, 47, 76, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Accuracy Trends
                  </Typography>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={accuracyData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                        <YAxis stroke="rgba(255,255,255,0.7)" domain={[85, 100]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#132f4c', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff'
                          }} 
                        />
                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          name="Accuracy %"
                          stroke="#4caf50"
                          strokeWidth={3}
                          dot={{ r: 6 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              {/* Recent Activity Chart */}
              <Grid item xs={12} sm={6} lg={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(19, 47, 76, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Detection Volume
                  </Typography>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={detections}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                        <YAxis stroke="rgba(255,255,255,0.7)" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#132f4c', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          name="Total Detections"
                          stroke="#8884d8" 
                          fillOpacity={1} 
                          fill="url(#colorTotal)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </motion.div>
    </Container>
  );
};

export default Dashboard;