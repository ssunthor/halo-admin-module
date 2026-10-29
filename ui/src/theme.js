import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => {
  let muiMode = 'light';
  let paletteOptions = {};

  const gttGreen = '#4ed869';
  const evoBlue = '#2b8aff';
  const alertRed = '#ef4444';
  const warningOrange = '#f59e0b';
  const infoCyan = '#06b6d4';

  if (mode === 'halloween') {
    muiMode = 'dark';
    paletteOptions = {
      primary: { main: '#ff2222', light: '#ff6666', dark: '#b30000', contrastText: '#ffffff' },
      secondary: { main: '#ff7700', light: '#ffa347', dark: '#b35300', contrastText: '#ffffff' },
      error: { main: '#ff0033' },
      warning: { main: '#ff8800' },
      info: { main: '#9c27b0' },
      background: { default: '#080002', paper: 'rgba(24, 2, 4, 0.88)' },
      text: { primary: '#fff0f0', secondary: '#ff9999' },
      divider: 'rgba(255, 30, 30, 0.25)',
    };
  } else if (mode === 'dark') {
    muiMode = 'dark';
    paletteOptions = {
      primary: { main: gttGreen },
      secondary: { main: evoBlue },
      error: { main: alertRed },
      warning: { main: warningOrange },
      info: { main: infoCyan },
      background: { default: '#050810', paper: 'rgba(10, 14, 26, 0.85)' },
      text: { primary: '#f8fafc', secondary: '#94a3b8' },
      divider: 'rgba(255, 255, 255, 0.08)',
    };
  } else if (mode === 'light') {
    muiMode = 'light';
    paletteOptions = {
      primary: { main: '#009a63' },
      secondary: { main: '#1d4ed8' },
      error: { main: '#dc2626' },
      warning: { main: '#d97706' },
      info: { main: '#0891b2' },
      background: { default: '#f8fafc', paper: 'rgba(255, 255, 255, 0.8)' },
      text: { primary: '#0f172a', secondary: '#64748b' },
      divider: 'rgba(0, 0, 0, 0.08)',
    };
  } else if (mode === 'pink') {
    muiMode = 'light';
    paletteOptions = {
      primary: { main: '#d81b60' },
      secondary: { main: evoBlue },
      error: { main: alertRed },
      warning: { main: warningOrange },
      info: { main: infoCyan },
      background: { default: '#f8bbd0', paper: '#fce4ec' },
      text: { primary: '#880e4f', secondary: '#ad1457' },
      divider: 'rgba(216, 27, 96, 0.25)',
    };
  } else if (mode === 'purple') {
    muiMode = 'light';
    paletteOptions = {
      primary: { main: '#8e24aa' },
      secondary: { main: evoBlue },
      error: { main: alertRed },
      warning: { main: warningOrange },
      info: { main: infoCyan },
      background: { default: '#e1bee7', paper: '#f3e5f5' },
      text: { primary: '#4a148c', secondary: '#6a1b9a' },
      divider: 'rgba(142, 36, 170, 0.25)',
    };
  } else if (mode === 'red') {
    muiMode = 'dark';
    paletteOptions = {
      primary: { main: alertRed },
      secondary: { main: evoBlue },
      error: { main: alertRed },
      warning: { main: warningOrange },
      info: { main: infoCyan },
      background: { default: '#1a0505', paper: 'rgba(38, 16, 16, 0.65)' },
      text: { primary: '#f8fafc', secondary: '#b89494' },
      divider: 'rgba(255, 68, 68, 0.15)',
    };
  } else if (mode === 'blue') {
    muiMode = 'dark';
    paletteOptions = {
      primary: { main: evoBlue },
      secondary: { main: gttGreen },
      error: { main: alertRed },
      warning: { main: warningOrange },
      info: { main: infoCyan },
      background: { default: '#050a1a', paper: 'rgba(16, 20, 38, 0.65)' },
      text: { primary: '#f8fafc', secondary: '#94a3b8' },
      divider: 'rgba(43, 138, 255, 0.15)',
    };
  } else {
    muiMode = 'dark';
    paletteOptions = {
      primary: { main: gttGreen },
      secondary: { main: evoBlue },
      error: { main: alertRed },
      warning: { main: warningOrange },
      info: { main: infoCyan },
      background: { default: '#050810', paper: 'rgba(10, 14, 26, 0.85)' },
      text: { primary: '#f8fafc', secondary: '#94a3b8' },
      divider: 'rgba(255, 255, 255, 0.08)',
    };
  }

  return createTheme({
    palette: {
      mode: muiMode,
      ...paletteOptions
    },
    typography: {
      fontFamily: mode === 'halloween' ? '"Roboto", "Creepster", sans-serif' : '"Roboto", sans-serif',
      h4: { 
        fontWeight: 600,
        letterSpacing: mode === 'halloween' ? '1px' : '-0.02em',
        fontFamily: mode === 'halloween' ? '"Creepster", cursive, sans-serif' : undefined,
        color: mode === 'halloween' ? '#ff2222' : undefined,
        textShadow: mode === 'halloween' ? '0 0 10px rgba(255, 0, 0, 0.6)' : undefined,
      },
      h5: { 
        fontWeight: 500,
        letterSpacing: mode === 'halloween' ? '1px' : '-0.01em',
        fontFamily: mode === 'halloween' ? '"Creepster", cursive, sans-serif' : undefined,
        color: mode === 'halloween' ? '#ff2222' : undefined,
        textShadow: mode === 'halloween' ? '0 0 10px rgba(255, 0, 0, 0.6)' : undefined,
      },
      h6: { 
        fontWeight: 500,
        letterSpacing: mode === 'halloween' ? '1px' : '-0.01em',
        fontFamily: mode === 'halloween' ? '"Creepster", cursive, sans-serif' : undefined,
        color: mode === 'halloween' ? '#ff3333' : undefined,
        textShadow: mode === 'halloween' ? '0 0 8px rgba(255, 0, 0, 0.5)' : undefined,
      },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: '3px',
            borderTopLeftRadius: '3px',
            borderTopRightRadius: '3px',
            backgroundColor: paletteOptions.primary.main,
            boxShadow: `0 -2px 12px 1px ${paletteOptions.primary.main}`,
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: mode === 'halloween' ? 'none' : 'uppercase',
            fontWeight: 600,
            letterSpacing: mode === 'halloween' ? '1.5px' : '0.06em',
            fontSize: mode === 'halloween' ? '1.25rem' : '0.85rem',
            fontFamily: mode === 'halloween' ? '"Creepster", cursive, sans-serif !important' : '"Roboto", sans-serif',
            color: mode === 'halloween' ? '#ff9999' : undefined,
            minHeight: '48px',
            padding: '6px 14px',
            minWidth: 'auto',
            transition: 'all 0.3s ease',
            '&.Mui-selected': {
              color: mode === 'halloween' ? '#ff1a1a !important' : undefined,
              textShadow: mode === 'halloween' 
                ? '0 0 12px #ff0000, 0 0 20px #ff0000 !important' 
                : `0 0 10px ${muiMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}`,
            },
            '&:hover': {
              color: mode === 'halloween' ? '#ff3333 !important' : undefined,
              textShadow: mode === 'halloween' ? '0 0 8px #ff0000 !important' : undefined,
              transform: mode === 'halloween' ? 'scale(1.06)' : undefined,
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            boxShadow: 'none',
            ...(mode === 'halloween' ? {
              backgroundColor: '#4a0000',
              color: '#ffaaaa',
              border: '1px solid #660000',
              '&:hover': {
                backgroundColor: '#660000',
                boxShadow: '0 0 12px rgba(255, 0, 0, 0.5)',
              }
            } : {
              '&:hover': {
                boxShadow: muiMode === 'dark' ? `0 0 12px rgba(78, 216, 105, 0.3)` : 'none',
              }
            })
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'halloween' ? 'rgba(16, 0, 0, 0.95)' : muiMode === 'dark' ? 'rgba(5, 8, 16, 0.8)' : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid',
            borderColor: mode === 'halloween' ? '#660000' : paletteOptions.divider,
            color: paletteOptions.text.primary,
            boxShadow: mode === 'halloween' ? '0 4px 20px rgba(255, 0, 0, 0.25)' : 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: paletteOptions.background.paper,
            backgroundImage: 'none',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid',
            borderColor: mode === 'halloween' ? 'rgba(102, 0, 0, 0.6)' : paletteOptions.divider,
            boxShadow: mode === 'halloween' ? '0 8px 32px rgba(255, 0, 0, 0.15)' : muiMode === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.2)' : '0 8px 32px rgba(0, 0, 0, 0.05)',
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: paletteOptions.background.paper,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid',
            borderColor: paletteOptions.divider,
            borderRadius: '12px',
            boxShadow: mode === 'halloween' ? '0 8px 32px rgba(255, 0, 0, 0.15)' : muiMode === 'dark' ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.05)',
            transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              borderColor: mode === 'halloween' ? '#ff3333' : muiMode === 'dark' ? 'rgba(78, 216, 105, 0.3)' : 'rgba(0, 154, 99, 0.3)',
              boxShadow: mode === 'halloween' ? '0 0 20px rgba(255, 0, 0, 0.4)' : muiMode === 'dark' ? '0 6px 32px rgba(0,0,0,0.3)' : '0 6px 32px rgba(0,0,0,0.08)',
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: '6px',
            fontWeight: 600,
          }
        }
      }
    },
  });
};

export default getTheme;
