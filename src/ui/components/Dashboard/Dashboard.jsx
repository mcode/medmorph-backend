import React, { useState, useMemo } from 'react';
import useStyles from './styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Sidebar from './Sidebar'
import NavBar from './NavBar';
import Collections from '../Collections';
function Dashboard() {

    const classes = useStyles()
    const [contentKey, setContentKey] = useState('');
    // can do useMemo to update labels like notifications
    const tabs = [
        {'key': 'overview', 'label': 'Overview', 'component': null},
        {'key': 'dashboard', 'label': 'Dashboard', 'component': <div>Dashboard content</div>},
        {'key': 'notifications', 'label': 'Notifications', 'component': <div>Notifications</div>},
        {'key': 'collections', 'label': 'Collections', 'component': null},
        {'key': 'servers', 'label': 'Servers', 'component': <Collections selectedCollection="servers" />},
        {'key': 'endpoints', 'label': 'Endpoints', 'component': <Collections selectedCollection="endpoints" />},
        {'key': 'subscriptions', 'label': 'Subscriptions', 'component': <Collections selectedCollection="subscriptions" />},
        {'key': 'plandefinitions', 'label': 'Plan Definitions', 'component': <Collections selectedCollection="plandefinitions" />},
        {'key': 'logs', 'label': 'Logs', 'component': <Collections selectedCollection="logs" />},
        {'key': 'completedreports', 'label': 'Completed Reports', 'component': <Collections selectedCollection="completedreports" />},
        {'key': 'reporting', 'label': 'Reporting', 'component': <Collections selectedCollection="reporting" />},
        {'key': 'errors', 'label': 'Errors', 'component': <Collections selectedCollection="errors" />},
        {'key': 'requests', 'label': 'Requests', 'component': <Collections selectedCollection="requests" />},
    ]
    const content = useMemo(() => {
        return tabs.find((tab) => {
            return tab.key === contentKey;
        })
    }, [contentKey])

    return (
        <div className={classes.container}>
            <NavBar />
            <Sidebar tabs={tabs} callback={setContentKey} selected={contentKey}/>
            <main className={classes.content}>
                <div className={classes.spacer} />
              {content ? content.component : 'Default'}
            </main>
        </div>
    )
}

export default Dashboard;