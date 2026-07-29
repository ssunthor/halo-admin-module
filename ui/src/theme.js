import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => {
  let muiMode = 'light';
  let paletteOptions = {};

  const gttGreen = '#4ed869';
  const evoBlue = '#2b8aff';
  const alertRed = '#ef4444';
  const warningOrange = '#f59e0b';
  const infoCyan = '#06b6d4';

  if (mode === 'dark') {
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
  }

  return createTheme({
    palette: {
      mode: muiMode,
      ...paletteOptions
    },
    typography: {
      fontFamily: '"Roboto", sans-serif',
      h4: { fontWeight: 600, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: muiMode === 'dark' ? `0 0 12px rgba(78, 216, 105, 0.3)` : 'none',
            }
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: muiMode === 'dark' ? 'rgba(5, 8, 16, 0.8)' : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid',
            borderColor: paletteOptions.divider,
            color: paletteOptions.text.primary,
            boxShadow: 'none',
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
            borderColor: paletteOptions.divider,
            boxShadow: muiMode === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.2)' : '0 8px 32px rgba(0, 0, 0, 0.05)',
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
            boxShadow: muiMode === 'dark' ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.05)',
            transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              borderColor: muiMode === 'dark' ? 'rgba(78, 216, 105, 0.3)' : 'rgba(0, 154, 99, 0.3)',
              boxShadow: muiMode === 'dark' ? '0 6px 32px rgba(0,0,0,0.3)' : '0 6px 32px rgba(0,0,0,0.08)',
            }
          }
        }
      },
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
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.06em',
            fontSize: '0.85rem',
            minHeight: '48px',
            padding: '6px 12px',
            minWidth: 'auto',
            transition: 'all 0.3s ease',
            '&.Mui-selected': {
               textShadow: `0 0 10px ${muiMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}`,
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