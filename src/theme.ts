import { createTheme, type PaletteMode } from '@mui/material/styles';

export function buildTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
      },
      secondary: {
        main: '#ec4899',
        light: '#f472b6',
        dark: '#db2777',
      },
      background: mode === 'light'
        ? { default: '#f8fafc', paper: '#ffffff' }
        : { default: '#0f172a', paper: '#1e293b' },
      error: {
        main: '#ef4444',
      },
      warning: {
        main: '#f59e0b',
      },
      success: {
        main: '#22c55e',
      },
      info: {
        main: '#3b82f6',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: mode === 'light' ? '#f8fafc' : '#1e293b',
            },
          },
        },
      },
    },
  });
}

const theme = buildTheme('light');
export default theme;
