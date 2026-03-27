import { createTheme, alpha, type PaletteMode } from '@mui/material/styles';

export function buildTheme(mode: PaletteMode) {
  const isLight = mode === 'light';

  const primaryMain = '#336BFA';

  return createTheme({
    palette: {
      mode,

      primary: {
        main: primaryMain,
        light: '#5C8BFF',
        dark: '#1E4ED8',
        contrastText: '#ffffff',
      },

      secondary: {
        main: '#ec4899',
        light: '#f472b6',
        dark: '#db2777',
        contrastText: '#ffffff',
      },

      background: isLight
        ? {
            default: '#F6F8FC',
            paper: '#FFFFFF',
          }
        : {
            default: '#0B1220',
            paper: '#111827',
          },

      text: isLight
        ? {
            primary: '#0F172A',
            secondary: '#475569',
          }
        : {
            primary: '#E5E7EB',
            secondary: '#9CA3AF',
          },

      divider: isLight ? '#E2E8F0' : '#1F2937',

      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#22c55e' },
      info: { main: '#3b82f6' },

      action: {
        hover: alpha(primaryMain, 0.08),
        selected: alpha(primaryMain, 0.16),
        disabledBackground: isLight ? '#E5E7EB' : '#1F2937',
      },
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',

      h1: { fontWeight: 700, letterSpacing: -0.5 },
      h2: { fontWeight: 700, letterSpacing: -0.3 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },

      button: {
        fontWeight: 600,
      },
    },

    shape: {
      borderRadius: 10,
    },

    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            paddingInline: 16,
          },
          containedPrimary: {
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: isLight
              ? '0 4px 12px rgba(0,0,0,0.06)'
              : '0 4px 16px rgba(0,0,0,0.4)',
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: isLight ? '#F1F5F9' : '#1F2937',
              borderBottom: 'none',
            },
          },
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isLight ? '#ffffff' : '#0B1220',
            borderBottom: `1px solid ${
              isLight ? '#E2E8F0' : '#1F2937'
            }`,
          },
        },
      },
    },
  });
}

const theme = buildTheme('light');
export default theme;