import { makeStyles, Theme as AugmentedTheme } from '@material-ui/styles';

export default makeStyles(
    (theme: AugmentedTheme) => ({
        app: {
            textAlign: "center",
            border: "1px solid black",
            width: "500px",
            height: "200px",
            margin: "50px auto",
          }
    }),
    { name: 'App', index: 1 }
);