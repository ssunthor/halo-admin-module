import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Tabs, Tab, Tooltip, IconButton, CircularProgress, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import PaletteIcon from '@mui/icons-material/Palette';
import LogoutIcon from '@mui/icons-material/Logout';
import ThemeContext from './ThemeContext.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import GitOpsPage from './pages/GitOpsPage.jsx';
import ReleasesPage from './pages/ReleasesPage.jsx';
import DocumentationPage from './pages/DocumentationPage.jsx';
import ConfigurationPage from './pages/ConfigurationPage.jsx';
import ChangelogViewer from './features/documentation/components/ChangelogViewer.jsx';
import { docsService } from './services/docsService.js';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
        },
    },
});

const fetchUser = async () => {
    const response = await fetch('/api/users/me');
    if (!response.ok) throw new Error('Could not fetch user data.');
    return response.json();
};

function NavigationTabs() {
    const location = useLocation();
    let currentTab = '/inventory';
    if (location.pathname.startsWith('/docs')) currentTab = '/docs';
    if (location.pathname.startsWith('/inventory')) currentTab = '/inventory';
    if (location.pathname.startsWith('/gitops')) currentTab = '/gitops';
    if (location.pathname.startsWith('/releases')) currentTab = '/releases';
    if (location.pathname.startsWith('/configuration')) currentTab = '/configuration';
    
    return (
        <Tabs 
            value={currentTab} 
            textColor="inherit" 
            indicatorColor="primary" 
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ flexGrow: 1 }}
        >
            <Tab label="Inventory" value="/inventory" to="/inventory" component={NavLink} />
            <Tab label="GitOps" value="/gitops" to="/gitops" component={NavLink} />
            <Tab label="Releases" value="/releases" to="/releases" component={NavLink} />
            <Tab label="Configuration" value="/configuration" to="/configuration" component={NavLink} />
            <Tab label="Documentation" value="/docs" to="/docs" component={NavLink} />
        </Tabs>
    );
}

function MainLayout() {
    const { themeMode, toggleTheme, setThemeMode, availableThemes } = useContext(ThemeContext);
    const { data: user, isLoading: loadingUser } = useQuery({
        queryKey: ['user'],
        queryFn: fetchUser,
        staleTime: Infinity,
    });

    const [anchorEl, setAnchorEl] = useState(null);
    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const themeColors = {
        dark: '#1e293b',
        light: '#f8fafc',
        pink: '#d81b60',
        purple: '#8e24aa',
        red: '#ef4444',
        blue: '#2b8aff'
    };

    const handleThemeSelect = async (theme) => {
        setThemeMode(theme);
        handleMenuClose();
        try {
            await fetch('/api/auth/me/theme', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme })
            });
        } catch (e) {
            console.error('Failed to save theme', e);
        }
    };

    useEffect(() => {
        const fetchGatewayTheme = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    if (data.theme) {
                        setThemeMode(data.theme);
                    }
                }
            } catch (err) {}
        };
        fetchGatewayTheme();
    }, [setThemeMode]);

    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [newVersions, setNewVersions] = useState([]);
    const [latestVersionsMap, setLatestVersionsMap] = useState(null);

    const { data: changelogData } = useQuery({ 
        queryKey: ['changelogData'], 
        queryFn: docsService.fetchChangelog, 
        staleTime: Infinity 
    });

    useEffect(() => {
        if (!changelogData || changelogData.length === 0) return;
        
        const lastSeenStr = localStorage.getItem('lastSeenChangelogs');
        let lastSeen = {};
        if (lastSeenStr) {
            try { lastSeen = JSON.parse(lastSeenStr); } catch (e) {}
        }

        const newReleases = [];
        const currentLatest = {};
        const moduleIds = [...new Set(changelogData.map(v => v.id))];
        
        moduleIds.forEach(moduleId => {
            const moduleReleases = changelogData.filter(v => v.id === moduleId);
            if (moduleReleases.length > 0) {
                currentLatest[moduleId] = moduleReleases[0].version;
                const seenVersion = lastSeen[moduleId];
                if (!seenVersion) {
                    newReleases.push(moduleReleases[0]); 
                } else {
                    const seenIndex = moduleReleases.findIndex(v => v.version === seenVersion);
                    if (seenIndex > 0) {
                        newReleases.push(...moduleReleases.slice(0, seenIndex));
                    } else if (seenIndex === -1) {
                        newReleases.push(moduleReleases[0]);
                    }
                }
            }
        });

        if (newReleases.length > 0) {
            newReleases.sort((a, b) => new Date(b.date) - new Date(a.date));
            setNewVersions(newReleases);
            setIsChangelogOpen(true);
            setLatestVersionsMap(currentLatest);
        }
    }, [changelogData]);

    const handleCloseChangelog = () => {
        if (latestVersionsMap) {
            const lastSeenStr = localStorage.getItem('lastSeenChangelogs');
            const lastSeen = lastSeenStr ? JSON.parse(lastSeenStr) : {};
            const merged = { ...lastSeen, ...latestVersionsMap };
            localStorage.setItem('lastSeenChangelogs', JSON.stringify(merged));
        }
        setIsChangelogOpen(false);
    };

    const isGuest = !user || user.username === 'unknown_user';

    return (
        <Router basename="/app/halo_admin_module/">
            <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Dialog open={isChangelogOpen} onClose={handleCloseChangelog} fullWidth maxWidth="md">
                    <DialogTitle>What's New in the Ecosystem</DialogTitle>
                    <DialogContent dividers>
                        <ChangelogViewer versions={newVersions} isPopup={true} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseChangelog} variant="contained">Close</Button>
                    </DialogActions>
                </Dialog>

                <AppBar position="static" elevation={0}>
                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ mr: 4, fontWeight: 'bold' }}>
                            <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic', mr: 1 }}>HAM</Box>
                            Halo Admin Module
                        </Typography>
                        
                        <NavigationTabs />

                        {loadingUser ? (
                            <CircularProgress size={24} color="inherit" sx={{ mr: 2 }} />
                        ) : (
                            <Typography sx={{ mr: 2, userSelect: 'none' }}>
                                Welcome, <Box component="span" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{user?.display_name || 'Guest'}</Box>
                            </Typography>
                        )}

                        <Tooltip title="Select Theme">
                            <IconButton onClick={handleMenuOpen} color="inherit" sx={{ ml: 1, mr: 1 }}>
                                <PaletteIcon />
                            </IconButton>
                        </Tooltip>
                        
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                        >
                            {availableThemes?.map(themeOption => (
                                <MenuItem 
                                    key={themeOption} 
                                    onClick={() => handleThemeSelect(themeOption)}
                                    selected={themeMode === themeOption}
                                    sx={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 1.5 }}
                                >
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: themeColors[themeOption] || 'grey', border: '1px solid', borderColor: 'divider' }} />
                                    {themeOption}
                                </MenuItem>
                            ))}
                        </Menu>

                        {!loadingUser && (
                            isGuest ? (
                                <Tooltip title="Login">
                                    <IconButton component="a" href="/oauth2/start" color="inherit">
                                        <LogoutIcon sx={{ transform: 'rotate(180deg)' }} />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <Tooltip title="Logout">
                                    <IconButton component="a" href="/logout" color="inherit">
                                        <LogoutIcon />
                                    </IconButton>
                                </Tooltip>
                            )
                        )}
                    </Toolbar>
                </AppBar>

                <Box sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/inventory" replace />} />
                        <Route path="/inventory" element={<InventoryPage />} />
                        <Route path="/gitops" element={<GitOpsPage />} />
                        <Route path="/releases" element={<ReleasesPage />} />
                        <Route path="/configuration" element={<ConfigurationPage />} />
                        <Route path="/docs" element={<DocumentationPage />} />
                        <Route path="/docs/:acronym" element={<ChangelogViewer />} />
                    </Routes>
                </Box>
            </Box>
        </Router>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <MainLayout />
        </QueryClientProvider>
    );
}

export default App;