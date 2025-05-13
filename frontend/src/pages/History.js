import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const History = () => {
  const { currentUser } = useAuth();
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch detection history
    const fetchHistory = async () => {
      try {
        setLoading(true);
        // In a real app, we would include auth token and user ID
        const response = await axios.get('/api/history');
        setDetections(response.data);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError('Failed to fetch detection history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser]);

  // Filter and sort detections
  const filteredDetections = detections
    .filter(detection => {
      if (filter === 'all') return true;
      return detection.detection_type === filter;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);

      if (sortBy === 'date-desc') {
        return dateB - dateA;
      } else if (sortBy === 'date-asc') {
        return dateA - dateB;
      } else if (sortBy === 'confidence-desc') {
        return b.confidence - a.confidence;
      } else {
        return a.confidence - b.confidence;
      }
    });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Detection History
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-label">Filter By</InputLabel>
              <Select
                labelId="filter-label"
                value={filter}
                label="Filter By"
                onChange={(e) => setFilter(e.target.value)}
              >
                <MenuItem value="all">All Detections</MenuItem>
                <MenuItem value="Emergency Vehicle">Emergency Vehicles</MenuItem>
                <MenuItem value="Regular Vehicle">Regular Vehicles</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="sort-label">Sort By</InputLabel>
              <Select
                labelId="sort-label"
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="date-desc">Date (Newest First)</MenuItem>
                <MenuItem value="date-asc">Date (Oldest First)</MenuItem>
                <MenuItem value="confidence-desc">Confidence (High to Low)</MenuItem>
                <MenuItem value="confidence-asc">Confidence (Low to High)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper elevation={0} sx={{ p: 3, backgroundColor: '#ffe0e0' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Showing {filteredDetections.length} detections
          </Typography>
          
          <Grid container spacing={3}>
            {filteredDetections.map((detection) => (
              <Grid item xs={12} sm={6} md={4} key={detection.detection_id}>
                <Card elevation={3}>
                  <CardActionArea>
                    <CardMedia
                      component="img"
                      height="180"
                      image={`/api/uploads/${detection.filename}`}
                      alt={`Detection ${detection.detection_id}`}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Chip 
                          label={detection.detection_type}
                          color={detection.detection_type === 'Emergency Vehicle' ? 'error' : 'primary'}
                          size="small"
                        />
                        <Typography variant="body2">
                          {Math.round(detection.confidence * 100)}% confidence
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        {new Date(detection.timestamp).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {filteredDetections.length === 0 && (
            <Box textAlign="center" my={8}>
              <Typography variant="h6" color="text.secondary">
                No detections found matching your filter criteria
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default History;