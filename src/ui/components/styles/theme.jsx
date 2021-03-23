import { createMuiTheme } from '@material-ui/core/styles';
const colors = {
    white: '#fff',
    black: '#222',
    red: '#d95d77',
    redDark: '#bb3551',
    blue: '#5d89a1',
    blueDark: '#386883',
    blueLighter: '#9ad2f0',
    gray: '#4a4a4a',
    grayMedium: '#676a70',
    grayBlue: '#cbd5df',
    grayBlueDark: '#7d8892',
    grayLight: '#4e5258',
    grayLighter: '#b5b6ba',
    grayLightest: '#eaeef2',
    grayDark: '#444',
    grayVeryDark: '#3a3a3a',
    green: '#2fa874',
    purple: '#8b72d6',
    turqoise: '#37c0ae',
  };

  const paletteBase = {
    primary: {
      main: colors.blue
    },
    secondary: {
      main: colors.turqoise,
    },
    error: {
      main: colors.red
    },
    common: colors,
    background: {
      default: colors.grayLightest,
      primary: colors.grayLight
    },
    text: {
      primary: colors.white,
      secondary: colors.white,
      gray: colors.grayLighter
    },
    grey: {
      800: colors.gray
    },
    purple: {
        main: colors.purple
    }
  };
  
  const materialUiOverridesBase = {
    MuiTableCell: {
        body: {
            color: 'black'
        },
        head: {
            color: 'black'
        }
    }
  }

  const theme = createMuiTheme({
    palette: { ...paletteBase },
    overrides: { ...materialUiOverridesBase },

  });

  export default theme;
