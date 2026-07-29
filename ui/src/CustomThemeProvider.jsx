import React, { useState, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import getTheme from './theme';
import ThemeContext from './ThemeContext';

function CustomThemeProvider({ children }) {
    const [themeMode, setThemeMode] = useState('dark');
    
    const theme = useMemo(() => getTheme(themeMode), [themeMode]);
    
    const toggleTheme = () => {
        setThemeMode(prevMode => prevMode === 'dark' ? 'light' : 'dark');
    };

    const availableThemes = ['dark', 'light', 'pink', 'purple', 'red', 'blue'];

    return (
        <ThemeContext.Provider value={{ themeMode, toggleTheme, setThemeMode, availableThemes }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}

export default CustomThemeProvider;