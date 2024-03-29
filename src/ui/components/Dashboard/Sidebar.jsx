import React, { memo } from 'react';
import useStyles from './styles';
import Drawer from '@material-ui/core/Drawer';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import List from '@material-ui/core/List';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import PropTypes from 'prop-types';

function Sidebar(props) {
  const { tabs, callback, selected } = props;
  const classes = useStyles();
  return (
    <div>
      <Drawer
        className={classes.drawer}
        variant="permanent"
        classes={{
          paper: classes.drawerPaper
        }}
        anchor="left"
      >
        <div className={`${classes.spacer} ${classes.corner}`}>
          <div className={classes.cornerText} onClick={callback.bind(this, 'dashboard')}>
            <strong>MedMorph</strong> Admin Console
          </div>
        </div>
        <List component="nav" classes={{ root: classes.overflow }}>
          {tabs.map(tab => {
            if (tab.component) {
              // return button
              const itemClass =
                tab.key === selected
                  ? `${classes.drawerItem} ${classes.selectedItem}`
                  : classes.drawerItem;
              return (
                <ListItem
                  button
                  key={tab.key}
                  classes={{ root: itemClass }}
                  onClick={callback.bind(this, tab.key)}
                >
                  <ListItemText primary={tab.label} classes={{ primary: classes.drawerItemText }} />
                  <ChevronRightIcon classes={{ root: classes.chevron }} />
                </ListItem>
              );
            } else {
              // return header
              return (
                <ListItem
                  key={tab.key}
                  classes={{ root: `${classes.drawerHead} ${classes.drawerItem}` }}
                >
                  <div>{tab.label.toUpperCase()}</div>
                  <div className={classes.breakLine}></div>
                </ListItem>
              );
            }
          })}
        </List>
      </Drawer>
    </div>
  );
}

Sidebar.propTypes = {
  tabs: PropTypes.array,
  callback: PropTypes.func,
  selected: PropTypes.bool
};

export default memo(Sidebar);
