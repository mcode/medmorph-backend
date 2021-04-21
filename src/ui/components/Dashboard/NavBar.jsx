import React, { useState, memo, useCallback } from 'react';
import useStyles from './styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Search from '@material-ui/icons/Search';
import InputAdornment from '@material-ui/core/InputAdornment';
import TextField from '@material-ui/core/TextField';
import NotificationsNoneIcon from '@material-ui/icons/NotificationsNone';
import Avatar from '@material-ui/core/Avatar';
import MenuOpenIcon from '@material-ui/icons/MenuOpen';
import Badge from '@material-ui/core/Badge';

import Menu from './Menu';
function NavBar(props) {
  const [open, setOpen] = useState(false);
  const { newNotifs, callback } = props;
  const classes = useStyles();

  const setNotif = useCallback(()=>{
      callback('notifications');
  });
  
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
              classes: { root: classes.searchInput }
            }}
            placeholder="Type a keyword..."
            fullWidth
          ></TextField>
          <Badge classes={{badge: classes.badge, root: classes.badgeRoot}} onClick={setNotif} variant='dot' overlap="circle" invisible={!newNotifs}>
            <NotificationsNoneIcon className={classes.icon} fontSize={'large'} />
          </Badge>
          <Avatar className={classes.avatar}>NB</Avatar>
          <MenuOpenIcon
            className={classes.icon}
            fontSize={'large'}
            onClick={setOpen.bind(this, true)}
          />
          <Menu open={open} callback={setOpen.bind(this, false)}></Menu>
        </Toolbar>
      </AppBar>
    </div>
  );
}

export default memo(NavBar);
