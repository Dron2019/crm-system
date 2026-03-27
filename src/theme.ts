import { createTheme, alpha, type PaletteMode } from '@mui/material/styles';

export function buildTheme(mode: PaletteMode) {
  const isLight = mode === 'light';

  const brand = '#336BFA';

  return createTheme({
    palette: {
      mode,

      primary: {
        main: brand,
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

      error: { main: '#EF4444' },
      warning: { main: '#F59E0B' },
      success: { main: '#22C55E' },
      info: { main: '#3B82F6' },

      action: {
        hover: alpha(brand, 0.08),
        selected: alpha(brand, 0.16),
        focus: alpha(brand, 0.24),
        disabledBackground: isLight ? '#E5E7EB' : '#1F2937',
      },

      // часто використовується в адмінках
      ...(isLight
        ? {
            sidebar: {
              main: '#FFFFFF',
              border: '#E2E8F0',
            },
          }
        : {
            sidebar: {
              main: '#0F172A',
              border: '#1F2937',
            },
          }),
    },

    typography: {
      fontFamily: '"Geist", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',

      // h1: { fontWeight: 700, letterSpacing: -0.5 },
      // h2: { fontWeight: 700, letterSpacing: -0.4 },
      // h3: { fontWeight: 600 },
      // h4: { fontWeight: 600 },
      // h5: { fontWeight: 600 },
      // h6: { fontWeight: 600 },

      button: {
        fontWeight: 400,
      },
    },

    shape: {
      borderRadius: 10,
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@font-face': [
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-Thin.ttf") format("truetype")', fontWeight: 100, fontStyle: 'normal', fontDisplay: 'swap' },
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-ExtraLight.ttf") format("truetype")', fontWeight: 200, fontStyle: 'normal', fontDisplay: 'swap' },
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-Light.ttf") format("truetype")', fontWeight: 300, fontStyle: 'normal', fontDisplay: 'swap' },
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-Regular.ttf") format("truetype")', fontWeight: 400, fontStyle: 'normal', fontDisplay: 'swap' },
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-Medium.ttf") format("truetype")', fontWeight: 500, fontStyle: 'normal', fontDisplay: 'swap' },
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-SemiBold.ttf") format("truetype")', fontWeight: 600, fontStyle: 'normal', fontDisplay: 'swap' },
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-Bold.ttf") format("truetype")', fontWeight: 700, fontStyle: 'normal', fontDisplay: 'swap' },
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-ExtraBold.ttf") format("truetype")', fontWeight: 800, fontStyle: 'normal', fontDisplay: 'swap' },
            { fontFamily: 'Geist', src: 'url("/assets/fonts/Geist-Black.ttf") format("truetype")', fontWeight: 900, fontStyle: 'normal', fontDisplay: 'swap' },
          ],
          body: {
            backgroundColor: isLight ? '#F6F8FC' : '#0B1220',
          },
        },
      },

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
              backgroundColor: '#2E5EEA',
            },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${isLight ? '#E2E8F0' : '#1F2937'}`,
            boxShadow: isLight
              ? '0 6px 18px rgba(0,0,0,0.05)'
              : '0 8px 24px rgba(0,0,0,0.45)',
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isLight ? '#FFFFFF' : '#0F172A',
            borderBottom: `1px solid ${
              isLight ? '#E2E8F0' : '#1F2937'
            }`,
            boxShadow: 'none',
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isLight ? '#FFFFFF' : '#0F172A',
            borderRight: `1px solid ${
              isLight ? '#E2E8F0' : '#1F2937'
            }`,
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

      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: alpha(brand, 0.05),
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

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: brand,
              borderWidth: 2,
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
          },
        },
      },
    },
  });
}

const theme = buildTheme('light');
export default theme;