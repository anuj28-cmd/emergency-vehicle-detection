import React, { useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, Typography, Button, Grid, Card, CardContent, 
  CardMedia, Container, Stack, Divider
} from '@mui/material';
import { 
  Speed as SpeedIcon,
  VerifiedUser as SecurityIcon,
  Analytics as AnalyticsIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Import only the AI detection image, removing the ambulance background
import aiDetectionImage from '../assets/Detection.png';

export default function Home() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Box>
      {/* Hero Section - Removed background image and made spacing symmetrical */}
      <Box
        sx={{
          position: 'relative',
          height: '80vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          backgroundColor: '#051826', // Dark solid background instead of image
          padding: '0 24px', // Add consistent horizontal padding
        }}
      >
        {/* Hero content */}
        <Container 
          maxWidth="lg" 
          sx={{ 
            position: 'relative', 
            zIndex: 2, 
            textAlign: 'center',
            py: 8,
            px: { xs: 2, sm: 4, md: 6 }, // Responsive horizontal padding
          }}
        >
          <Typography 
            variant="h2" 
            component="h1"
            sx={{ 
              fontWeight: 700, 
              mb: 2,
              color: 'white',
              textShadow: '0 0 20px rgba(0,0,0,0.4)'
            }}
          >
            Emergency Vehicles Detection
          </Typography>
          
          <Typography 
            variant="h5" 
            component="p"
            sx={{ 
              mb: 5, 
              maxWidth: '800px',
              mx: 'auto', // Center the text horizontally
              color: '#e0e0e0',
              textShadow: '0 0 10px rgba(0,0,0,0.8)'
            }}
          >
            Advanced AI-powered system for real-time detection and tracking of emergency
            vehicles, enhancing road safety and emergency response operations.
          </Typography>
          
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2}
            justifyContent="center"
          >
            <Button 
              component={RouterLink} 
              to={isAuthenticated ? "/detector" : "/register"}
              variant="contained" 
              color="primary"
              size="large"
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {isAuthenticated ? 'Launch Detector' : 'Get Started'}
            </Button>
            <Button 
              variant="outlined" 
              color="primary"
              size="large"
              component={RouterLink}
              to="/dashboard"
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1rem',
                fontWeight: 600,
                borderWidth: '2px',
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                }
              }}
            >
              Learn More
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography 
          variant="h3" 
          component="h2"
          align="center" 
          sx={{ mb: 2 }}
        >
          Key Features
        </Typography>
        <Typography 
          variant="subtitle1" 
          align="center"
          color="text.secondary"
          sx={{ mb: 6, maxWidth: '700px', mx: 'auto' }}
        >
          Our intelligent system offers cutting-edge capabilities to enhance emergency response
          and improve overall road safety through advanced AI technology.
        </Typography>
        
        <Grid container spacing={4}>
          {[
            {
              icon: <SpeedIcon fontSize="large" sx={{ color: 'primary.main' }} />,
              title: "Real-time Detection",
              description: "Instantly identify emergency vehicles with our advanced AI model. Process video feeds in real-time with minimal latency."
            },
            {
              icon: <SecurityIcon fontSize="large" sx={{ color: 'primary.main' }} />,
              title: "Enhanced Safety",
              description: "Improve emergency response times and road safety by automatically detecting and prioritizing emergency vehicles."
            },
            {
              icon: <AnalyticsIcon fontSize="large" sx={{ color: 'primary.main' }} />,
              title: "Detailed Analytics",
              description: "Track detection history, analyze response times, and generate reports to continuously improve safety measures."
            },
            {
              icon: <ScienceIcon fontSize="large" sx={{ color: 'primary.main' }} />,
              title: "Advanced AI",
              description: "Powered by state-of-the-art deep learning models trained on thousands of emergency vehicle images for maximum accuracy."
            }
          ].map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ backgroundColor: 'background.paper', py: 10 }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            component="h2"
            align="center" 
            sx={{ mb: 2 }}
          >
            How It Works
          </Typography>
          <Typography 
            variant="subtitle1" 
            align="center"
            color="text.secondary"
            sx={{ mb: 6, maxWidth: '700px', mx: 'auto' }}
          >
            Our advanced system utilizes deep learning and computer vision to detect
            emergency vehicles in various environments and conditions.
          </Typography>

          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src={aiDetectionImage}
                alt="AI Detection Process"
                sx={{
                  width: '100%',
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ pl: { md: 4 } }}>
                <Typography variant="h4" component="h3" gutterBottom color="primary.main">
                  Intelligent Detection Process
                </Typography>
                
                <Typography paragraph>
                  Our system uses a sophisticated neural network trained on thousands of images
                  of emergency vehicles in various conditions and environments.
                </Typography>
                
                <Box sx={{ my: 3 }}>
                  <Typography variant="h6" component="h4" gutterBottom>
                    1. Image Capture
                  </Typography>
                  <Typography paragraph color="text.secondary">
                    High-quality video feeds are processed frame by frame for real-time analysis.
                  </Typography>
                  
                  <Typography variant="h6" component="h4" gutterBottom>
                    2. Deep Learning Analysis
                  </Typography>
                  <Typography paragraph color="text.secondary">
                    Our AI model identifies emergency vehicles based on visual characteristics
                    including lights, markings, and vehicle type.
                  </Typography>
                  
                  <Typography variant="h6" component="h4" gutterBottom>
                    3. Alert Generation
                  </Typography>
                  <Typography paragraph color="text.secondary">
                    When an emergency vehicle is detected, the system generates instant
                    alerts and triggers automated responses.
                  </Typography>
                  
                  <Typography variant="h6" component="h4" gutterBottom>
                    4. Data Analysis
                  </Typography>
                  <Typography paragraph color="text.secondary">
                    All detection data is stored and analyzed to improve system performance
                    and provide valuable insights.
                  </Typography>
                </Box>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  size="large"
                  component={RouterLink}
                  to="/detector"
                  sx={{ mt: 2 }}
                >
                  Try the Demo
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Card sx={{ 
          p: 6, 
          background: 'linear-gradient(135deg, #0c1d33, #05101e)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Typography 
            variant="h3" 
            component="h2" 
            gutterBottom
          >
            Ready to Enhance Emergency Response?
          </Typography>
          <Typography 
            variant="subtitle1" 
            color="text.secondary" 
            paragraph
            sx={{ 
              mb: 4, 
              maxWidth: '600px', 
              mx: 'auto',
            }}
          >
            Join our network of smart cities and emergency services using AI to improve
            response times and save lives.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            size="large"
            component={RouterLink}
            to={isAuthenticated ? "/detector" : "/register"}
            sx={{
              py: 1.5,
              px: 5,
              fontSize: '1.1rem',
            }}
          >
            {isAuthenticated ? 'Access Dashboard' : 'Sign Up Now'}
          </Button>
        </Card>
      </Container>
      
      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          py: 8, 
          backgroundColor: 'background.paper',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography 
                variant="h6" 
                component="h6"
                sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}
              >
                EVDetection
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Advanced AI-powered emergency vehicle detection system. Enhancing road safety and emergency response through intelligent technology.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="h6" component="h6" sx={{ mb: 2 }}>
                Quick Links
              </Typography>
              <Typography variant="body2">
                <RouterLink to="/detector" style={{ color: 'inherit', display: 'block', marginBottom: '8px' }}>
                  Detector
                </RouterLink>
                <RouterLink to="/dashboard" style={{ color: 'inherit', display: 'block', marginBottom: '8px' }}>
                  Dashboard
                </RouterLink>
                <RouterLink to="/history" style={{ color: 'inherit', display: 'block', marginBottom: '8px' }}>
                  History
                </RouterLink>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="h6" component="h6" sx={{ mb: 2 }}>
                Connect
              </Typography>
              <Typography variant="body2">
                <a href="mailto:anuj.udapure22@vit.edu" style={{ color: 'inherit', display: 'block', marginBottom: '8px' }}>
                  anuj.udapure22@vit.edu
                </a>
                <a href="tel:+91 7588399605" style={{ color: 'inherit', display: 'block', marginBottom: '8px' }}>
                  +91 7588399605
                </a>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Vit pune, Maharashtra, India
                </Typography>
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Emergency Vehicles Detection System. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}