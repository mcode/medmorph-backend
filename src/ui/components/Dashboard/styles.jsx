import { red } from '@material-ui/core/colors';
import { makeStyles } from '@material-ui/core/styles';
const drawerWidth = 20.8;
const toolbarHeight = 95;
export default makeStyles(
    (theme) => ({
        appBar: {
            width: `${100 - drawerWidth}%`,
            paddingLeft: '10px',
            backgroundColor: theme.palette.common.white
        },
        avatar: {
            backgroundColor: theme.palette.common.turqoise,
            width: '45px',
            height: '45px',
            fontSize: '20px',
            color: 'white',
            fontWeight: 'bold',
            margin: '0 15px 0 15px'
        },
        breakLine: {
            flexGrow: 1,
            borderBottom: `1px solid ${theme.palette.common.grayMedium}`,
            height: `.25em`,
            display: 'flex',
            margin: '0 15px 0 10px'
        },
        chevron: {
            marginRight: '10px',
            fontSize: '28px',
        },
        container: {
            display: 'flex',
            WebkitFontSmoothing: 'antialiased',
            fontFamily: 'Verdana',
        },
        content: {
            flexGrow: 1,
            backgroundColor: theme.palette.background.default,
            minHeight: '100vh',
            color: 'black',
        },
        corner: {
            backgroundColor: theme.palette.common.purple,
            verticalAlign: 'middle',

        },
        cornerText: {
            fontSize: '20px',
            fontFamily: 'Verdana',
            color: theme.palette.text.primary,
            textAlign: 'center'
        },

        drawer: {
            width: `${drawerWidth}vw`,
            flexShrink: 0,
        },
        drawerHead: {
            backgroundColor: theme.palette.background.primary,
            color: theme.palette.text.gray,
            fontSize: '13px',
            fontWeight: 600,
        },
        drawerItem: {
            textAlign: 'left',
            paddingLeft: '35px',
            display: 'flex',
            height: '70px',
        },
        drawerItemText: {
            fontFamily: 'Verdana',
            fontSize: '18px',
            fontWeight: 500,
        },
        drawerPaper: {
            width: `${drawerWidth}vw`,
            borderRight: '0px',
            backgroundColor: theme.palette.background.primary

        },
        header: {
            height: `${toolbarHeight}px`,
            color: theme.palette.common.grayVeryDark,
        },
        icon: {
            margin: '0 12px 0 12px'
        },
        menu: {
            width: '300px',
            fontSize: '25px',
            color: theme.palette.common.grayVeryDark
        },
        overflow: {
            overflowY: 'scroll',
        },
        searchInput: {
            '&::placeholder': {
                fontStyle: 'italic',
            },
            fontSize: '20px',
            color: theme.palette.common.grayVeryDark,

        },
        selectedItem: {
            backgroundColor: theme.palette.secondary.main,
            '&:hover': {
                backgroundColor: theme.palette.secondary.main
            }
        },
        // make sure things don't appear behind the nav bar
        spacer: {
            minHeight: `${toolbarHeight}px`,
            lineHeight: `${toolbarHeight}px`,
        },
    }),

    { name: 'Dashboard', index: 1 }
);
