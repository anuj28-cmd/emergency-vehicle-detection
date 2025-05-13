import React, { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { 
  AppBar, Toolbar, Typography, Button, IconButton, Avatar,
  Drawer, List, ListItem, ListItemIcon, ListItemText,
  Box, Divider, useMediaQuery, useTheme, Menu, MenuItem
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  NotificationsActive as DetectorIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Equalizer as StatsIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    minHeight: '100vh',
    [theme.breakpoints.up('md')]: {
      marginLeft: open ? drawerWidth : 0,
    },
  }),
);

const NavButton = styled(Button)(({ theme, active }) => ({
  margin: theme.spacing(0, 0.5),
  color: active ? theme.palette.primary.main : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  position: 'relative',
  '&::after': active ? {
    content: '""',
    position: 'absolute',
    bottom: 5,
    left: '20%',
    width: '60%',
    height: '3px',
    backgroundColor: theme.palette.primary.main,
    borderRadius: '3px'
  } : {},
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: '0 0 15px rgba(0, 229, 255, 0.5)',
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'center',
  backgroundColor: theme.palette.background.paper,
}));

const StyledListItem = styled(ListItem)(({ theme, active }) => ({
  marginBottom: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: active ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
  '&:hover': {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  color: active ? theme.palette.primary.main : theme.palette.text.primary,
  '& .MuiListItemIcon-root': {
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
  },
}));

export default function Layout({ children }) {
  const { currentUser, logout, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/');
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Detector', icon: <DetectorIcon />, path: '/detector' },
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'History', icon: <HistoryIcon />, path: '/history' },
  ];

  if (isAdmin) {
    menuItems.push({ text: 'Statistics', icon: <StatsIcon />, path: '/statistics' });
    menuItems.push({ text: 'Settings', icon: <SettingsIcon />, path: '/settings' });
  }

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DrawerHeader>
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            fontWeight: 700, 
            background: 'linear-gradient(to right, #00e5ff, #2196f3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          EVDetection
        </Typography>
      </DrawerHeader>
      <Divider />
      <List sx={{ px: 2, flex: 1 }}>
        {menuItems.map((item) => (
          <StyledListItem 
            button 
            key={item.text} 
            component={RouterLink} 
            to={item.path}
            active={isActive(item.path) ? 1 : 0}
            onClick={isMobile ? handleDrawerToggle : undefined}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </StyledListItem>
        ))}
      </List>
      {isAuthenticated && (
        <Box sx={{ p: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <StyledAvatar>{currentUser?.username?.charAt(0).toUpperCase()}</StyledAvatar>
            <Box sx={{ ml: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {currentUser?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {currentUser?.role || 'User'}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<LogoutIcon />}
            onClick={logout}
            fullWidth
          >
            Logout
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, ml: 1, flexGrow: 1 }}>
            {menuItems.slice(0, 3).map((item) => (
              <NavButton 
                key={item.text}
                component={RouterLink}
                to={item.path}
                active={isActive(item.path) ? 1 : 0}
                startIcon={item.icon}
              >
                {item.text}
              </NavButton>
            ))}
          </Box>
          
          <Box sx={{ flexGrow: { xs: 1, sm: 0 } }} />
          
          {isAuthenticated ? (
            <>
              <StyledAvatar onClick={handleMenuOpen}>
                {currentUser?.username?.charAt(0).toUpperCase()}
              </StyledAvatar>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleProfileClick}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  Profile
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/login"
                sx={{ marginRight: 1 }}
              >
                Login
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                component={RouterLink} 
                to="/register"
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: theme.palette.background.default,
              backgroundImage: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: theme.palette.background.dark,
              backgroundImage: 'none',
              border: 'none',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Main open={!isMobile}>
        <Toolbar />
        <Box component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </Box>
      </Main>
    </Box>
  );
}