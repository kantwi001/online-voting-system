import React, { useEffect, useState } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Avatar, Chip, Stack, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import AddBoxIcon from '@mui/icons-material/AddBox';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 220;

import { useUserCount } from './hooks';

export default function DashboardLayout({ selected, onSelect, children, username, role }) {
  const isAdmin = role === 'admin';
  const userCount = useUserCount(username, isAdmin);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (isAdmin && username) {
      fetch(`http://localhost:5001/users?username=${encodeURIComponent(username)}`)
        .then(async res => {
          if (res.ok) setUsers(await res.json());
        })
        .catch(() => {});
    }
  }, [isAdmin, username]);
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#f4f6fa' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: 1201, background: 'linear-gradient(90deg, #1976d2 70%, #21a1e1 100%)', boxShadow: '0 2px 12px 0 rgba(25, 118, 210, 0.10)' }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 1 }}>
            Online Voting System
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#e3f2fd' }}>
            {username && `Welcome, ${username}`}
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #f4f6fa 80%, #e3f2fd 100%)',
            borderRight: '1px solid #e0e0e0',
            borderTopRightRadius: 20,
            borderBottomRightRadius: 20,
            boxShadow: '2px 0 12px 0 rgba(25, 118, 210, 0.05)',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: 2 }}>
          {isAdmin && (
            <>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
                Registered Users: {userCount !== null ? userCount : '...'}
              </Typography>
              <Box sx={{ maxHeight: 120, overflowY: 'auto', background: '#f8fafc', borderRadius: 2, p: 1, mb: 2, boxShadow: '0 1px 4px 0 rgba(25,118,210,0.03)' }}>
                <Stack spacing={1}>
                  {users.map(u => (
                    <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: u.role === 'admin' ? '#1976d2' : '#90caf9', fontSize: 16 }}>{u.username[0]?.toUpperCase()}</Avatar>
                      <Typography sx={{ fontSize: 15, flex: 1 }}>{u.username}</Typography>
                      <Chip label={u.role} size="small" color={u.role === 'admin' ? 'primary' : 'default'} sx={{ fontSize: 11, textTransform: 'capitalize' }} />
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Divider sx={{ mb: 1 }} />
            </>
          )}
          <List sx={{ mt: 2 }}>
            <ListItem button selected={selected === 'dashboard'} onClick={() => onSelect('dashboard')}>
              <ListItemIcon><DashboardIcon color={selected === 'dashboard' ? 'primary' : 'action'} /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            <ListItem button selected={selected === 'createElection'} onClick={() => onSelect('createElection')}>
              <ListItemIcon><AddBoxIcon color={selected === 'createElection' ? 'primary' : 'action'} /></ListItemIcon>
              <ListItemText primary="Create Election" />
            </ListItem>
            <ListItem button selected={selected === 'changePassword'} onClick={() => onSelect('changePassword')}>
              <ListItemIcon><HowToVoteIcon color={selected === 'changePassword' ? 'primary' : 'action'} /></ListItemIcon>
              <ListItemText primary="Change Password" />
            </ListItem>
            {isAdmin && (
              <ListItem button selected={selected === 'settings'} onClick={() => onSelect('settings')}>
                <ListItemIcon><DashboardIcon color={selected === 'settings' ? 'primary' : 'action'} /></ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItem>
            )}
            <ListItem button onClick={() => onSelect('logout')}>
              <ListItemIcon><LogoutIcon color={selected === 'logout' ? 'primary' : 'action'} /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, marginLeft: `${drawerWidth}px` }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
