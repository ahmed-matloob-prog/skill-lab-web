import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  People,
  Assessment,
  Quiz,
  Sync,
  AdminPanelSettings,
  AccountCircle,
  Logout,
  Dashboard,
  Language,
  CloudDone,
  CloudOff,
  CloudSync,
  Error as ErrorIcon,
  BarChart,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { useLanguage } from '../contexts/LanguageContext';
import { USER_ROLES } from '../constants';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const { syncStatus, pendingSyncCount } = useDatabase();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Sync status configuration
  const getSyncConfig = () => {
    switch (syncStatus) {
      case 'online':
        return {
          icon: <CloudDone fontSize="small" />,
          label: 'Synced',
          color: 'success' as const,
          tooltip: 'All data synced to cloud'
        };
      case 'syncing':
        return {
          icon: <CloudSync fontSize="small" />,
          label: `Syncing (${pendingSyncCount})`,
          color: 'info' as const,
          tooltip: `${pendingSyncCount} items pending sync`
        };
      case 'offline':
        return {
          icon: <CloudOff fontSize="small" />,
          label: 'Offline',
          color: 'warning' as const,
          tooltip: 'Working offline - changes will sync when online'
        };
      case 'error':
        return {
          icon: <ErrorIcon fontSize="small" />,
          label: 'Error',
          color: 'error' as const,
          tooltip: 'Sync error - please check your connection'
        };
      default:
        return {
          icon: <CloudOff fontSize="small" />,
          label: 'Offline',
          color: 'default' as const,
          tooltip: 'Status unknown'
        };
    }
  };

  const syncConfig = getSyncConfig();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    handleMenuClose();
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Students', icon: <People />, path: '/students' },
    { text: 'Input Data', icon: <Assessment />, path: '/input' },
    { text: 'Assessments', icon: <Quiz />, path: '/assessments' },
    { text: 'Attendance Report', icon: <BarChart />, path: '/attendance-report' },
  ];

  // Add admin-only menu items
  if (user?.role === USER_ROLES.ADMIN) {
    menuItems.push(
      { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' }
    );
  }

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Student Attendance
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Student Attendance'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Sync Status Indicator */}
            <Tooltip title={syncConfig.tooltip} arrow>
              <Chip
                icon={syncConfig.icon}
                label={syncConfig.label}
                color={syncConfig.color}
                size="small"
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  fontWeight: 500,
                  '& .MuiChip-icon': {
                    animation: syncStatus === 'syncing' ? 'spin 2s linear infinite' : 'none'
                  },
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
            </Tooltip>

            {/* Mobile sync indicator - icon only */}
            <Tooltip title={syncConfig.tooltip} arrow>
              <IconButton
                size="small"
                color="inherit"
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  '& svg': {
                    animation: syncStatus === 'syncing' ? 'spin 2s linear infinite' : 'none'
                  }
                }}
              >
                {syncConfig.icon}
              </IconButton>
            </Tooltip>

            <IconButton
              size="large"
              aria-label="language switcher"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              color="inherit"
            >
              <Language />
            </IconButton>
            <Typography variant="body2" sx={{ mr: 2 }}>
              Welcome, {user?.username}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;


