import React, { useState } from 'react';
import useStyles from './styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Search from '@material-ui/icons/Search';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import TextField  from '@material-ui/core/TextField';
import NotificationsNoneIcon from '@material-ui/icons/NotificationsNone';
import Avatar from '@material-ui/core/Avatar';
import MenuOpenIcon from '@material-ui/icons/MenuOpen';
import Menu from './Menu';
function NavBar() {
    const [open, setOpen] = useState(false);

    const classes = useStyles()
    return (
        <div>
            <AppBar position="fixed" className={classes.appBar}>
                <Toolbar className={classes.header}>
                    <TextField
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize={'large'}></Search>
                                </InputAdornment>
                            ),
                            disableUnderline: true,
                            classes: {root: classes.searchInput}
                            }}

                            placeholder="Type a keyword..."
                            fullWidth
                    >
                    </TextField>
                    <NotificationsNoneIcon className={classes.icon} fontSize={'large'} />
                    <Avatar className={classes.avatar}>NB</Avatar>
                    <MenuOpenIcon className={classes.icon} fontSize={'large'} onClick={() => {setOpen(true)}}/>
                    <Menu open={open} callback={() => {setOpen(false)}}></Menu>
                </Toolbar>
            </AppBar>
        </div>
    )
}

export default NavBar;