import { makeStyles } from '@material-ui/core/styles';
export default makeStyles(
  theme => ({
    break: {
      width: '100%',
      height: '0',
      borderTop: '1px solid',
      borderColor: theme.palette.common.grayHighlight,
      marginBottom: '45px'
    },
    boolSwitch: {
      flex: 2
    },
    collection: {
      margin: '60px auto',
      width: '75vw',
      backgroundColor: 'white',
      paddingBottom: '60px'
    },
    option: {
      height: '60px',
      marginLeft: '50px',
      display: 'flex'
    },
    optionId: {
      marginTop: '15px',
      flex: 4
    },
    optionInput: {
      flex: 20
    },

    optionText: {
      backgroundColor: theme.palette.common.turqoiseLight,
      color: theme.palette.common.gray,
      fontFamily: 'monospace',
      fontWeight: 600,
      fontSize: '14px',
      float: 'left',
      padding: '10px'
    },
    optionTextField: {
      fontWeight: 600,
      color: theme.palette.common.gray
    },
    optionTextFieldLabel: {
      color: theme.palette.common.grayLighter
    },
    spacer: {
      flex: 1
    },
    spacerBool: {
      flex: 18,
      float: 'left',
      fontWeight: 600,
      color: theme.palette.common.gray,
      marginTop: '10px',
      display: 'inline-flex',
      paddingTop: '10px'
    },
    topBar: {
      height: '70px',
      lineHeight: '70px'
    },
    topBarText: {
      float: 'left',
      fontFamily: 'verdana',
      fontSize: '18px',
      color: theme.palette.common.grayDark,
      marginLeft: '50px'
    }
  }),
  { name: 'Config', index: 1 }
);
