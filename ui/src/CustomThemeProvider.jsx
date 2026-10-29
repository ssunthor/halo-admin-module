import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import getTheme from './theme';
import ThemeContext from './ThemeContext';
import SeasonalOverlay from './components/common/SeasonalOverlay';

const APP_ID = 'halo_admin_module';
const BASE_THEMES = ['dark', 'light', 'pink', 'purple', 'red', 'blue'];

/*
 * Theme resolution (all seasonal logic lives in the GIA Gateway backend, see gia_gateway/core/seasonal_helper.py):
 *   - serverTheme:    user's saved standard theme (always one of BASE_THEMES)
 *   - seasonalEvent:  auto-applied seasonal theme for this app (null if none running / opted out / app not enabled)
 *   - seasonalThemes: seasonal themes the user may pick here (running event, or all events for preview users)
 *   - userChoice:     theme clicked in this tab (persisted server-side; opt-outs are decided by the backend)
 */
function CustomThemeProvider({ children }) {
    const [isLoading, setIsLoading] = useState(true);
    const [serverTheme, setServerTheme] = useState('dark');
    const [seasonalEvent, setSeasonalEvent] = useState(null);
    const [seasonalThemes, setSeasonalThemes] = useState([]);
    const [userChoice, setUserChoice] = useState(null);

    useEffect(() => {
        const fetchGatewayData = async () => {
            try {
                const res = await fetch(`/api/auth/me?app=${APP_ID}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.theme) setServerTheme(data.theme);
                    setSeasonalEvent(data.seasonal_event || null);
                    setSeasonalThemes(data.seasonal_themes || []);
                }
            } catch (err) {
                console.error('Failed to load theme configuration', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchGatewayData();
    }, []);

    const availableThemes = useMemo(() => [...seasonalThemes, ...BASE_THEMES], [seasonalThemes]);

    const effectiveTheme = useMemo(() => {
        if (userChoice && availableThemes.includes(userChoice)) return userChoice;
        return seasonalEvent || serverTheme || 'dark';
    }, [userChoice, availableThemes, seasonalEvent, serverTheme]);

    const activeSeasonal = seasonalThemes.includes(effectiveTheme) ? effectiveTheme : null;
    const isHalloween = activeSeasonal === 'halloween';

    const setThemeMode = useCallback(async (newTheme) => {
        setUserChoice(newTheme);
        try {
            const res = await fetch(`/api/auth/me/theme?app=${APP_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
                body: JSON.stringify({ theme: newTheme })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.theme) setServerTheme(data.theme);
            }
        } catch (e) {
            console.error('Failed to update theme on server', e);
        }
    }, []);

    const toggleTheme = () => setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark');

    const theme = useMemo(() => getTheme(effectiveTheme), [effectiveTheme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        document.documentElement.setAttribute('data-seasonal', activeSeasonal || 'none');
    }, [effectiveTheme, activeSeasonal]);

    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    height: '100vh',
                    width: '100vw',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#050810'
                }}
            >
                <CircularProgress color="primary" />
            </Box>
        );
    }

    return (
        <ThemeContext.Provider value={{
            themeMode: effectiveTheme,
            userThemeMode: userChoice || serverTheme,
            toggleTheme,
            setThemeMode,
            availableThemes,
            isHalloween,
            seasonalEvent: activeSeasonal,
        }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <SeasonalOverlay seasonalEvent={activeSeasonal} />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}

export default CustomThemeProvider;
