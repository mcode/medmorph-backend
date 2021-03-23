import React, { useState } from 'react';
import useStyles from './styles';
import Drawer from '@material-ui/core/Drawer';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import List from '@material-ui/core/List';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListSubheader from '@material-ui/core/ListSubheader';

function Sidebar(props) {
    const { tabs, callback, selected, ...other } = props;
    const classes = useStyles()
    return (
        <div>
            <Drawer
                className={classes.drawer}
                variant="permanent"
                classes={{
                    paper: classes.drawerPaper,
                }}
                anchor="left"
            >
                <div className={`${classes.spacer} ${classes.corner}`}>
                    <div className={classes.cornerText}>
                        <strong>MedMorph</strong> Admin Console
                    </div>
                </div>
                <List component='nav' classes={{root: classes.overflow}}>
                    {tabs.map((tab) => {
                        if (tab.component) {
                            // return button
                            const itemClass = tab.key === selected ? `${classes.drawerItem} ${classes.selectedItem}`: classes.drawerItem;
                            return (
                                <ListItem button key={tab.key} classes={{root: itemClass}} onClick={()=>{callback(tab.key)}}>
                                    <ListItemText primary={tab.label} classes={{primary: classes.drawerItemText}}/>
                                    <ChevronRightIcon classes={{root: classes.chevron}} />
                                </ListItem>
                            )
                        } else {
                            // return header
                            return (
                                <ListItem key={tab.key} classes={{root: `${classes.drawerHead} ${classes.drawerItem}`}}>
                                    <div>{tab.label.toUpperCase()}</div>
                                    <div className={classes.breakLine}></div>
                                </ListItem>
                            )
                        }
                    })}

                </List>

            </Drawer>
        </div>
    )
}

export default Sidebar;