import React, { useState, useMemo, memo } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';
import useStyles from './styles';
import Sidebar from './Sidebar';
import NavBar from './NavBar';
import Collections from '../Collections';
import Dashboard from './Dashboard';
import Notifications from '../Notifications';

function DashboardLayout() {
  const classes = useStyles();
  const [contentKey, setContentKey] = useState('dashboard');

  const { data } = useQuery(['notifications'], () => axios.get(`/collection/notifications`));

  const unviewedNotifs = useMemo(() => {
    if (data) {
      return data.data.filter(notif => !notif.viewed);
    }
    return [];
  }, [data]);

  const newNotifs = unviewedNotifs.length > 0;
  // can do useMemo to update labels like notifications
  const tabs = useMemo(() => {
    return [
      { key: 'overview', label: 'Overview', component: null },
      { key: 'dashboard', label: 'Dashboard', component: <Dashboard /> },
      {
        key: 'notifications',
        label: `Notifications ${newNotifs ? `(${unviewedNotifs.length})` : ''}`,
        component: <Notifications notifs={unviewedNotifs} />
      },
      { key: 'config', label: 'Config', component: <Collections selectedCollection="config" /> },
      { key: 'collections', label: 'Collections', component: null },
      { key: 'servers', label: 'Servers', component: <Collections selectedCollection="servers" /> },
      {
        key: 'endpoints',
        label: 'Endpoints',
        component: <Collections selectedCollection="endpoints" />
      },
      {
        key: 'subscriptions',
        label: 'Subscriptions',
        component: <Collections selectedCollection="subscriptions" />
      },
      {
        key: 'plandefinitions',
        label: 'Plan Definitions',
        component: <Collections selectedCollection="plandefinitions" />
      },
      { key: 'logs', label: 'Logs', component: <Collections selectedCollection="logs" /> },
      {
        key: 'completedreports',
        label: 'Completed Reports',
        component: <Collections selectedCollection="completedreports" />
      },
      {
        key: 'reporting',
        label: 'Reporting',
        component: <Collections selectedCollection="reporting" />
      },
      { key: 'errors', label: 'Errors', component: <Collections selectedCollection="errors" /> },
      {
        key: 'requests',
        label: 'Requests',
        component: <Collections selectedCollection="requests" />
      }
    ];
  });

  const content = useMemo(() => {
    return tabs.find(tab => {
      return tab.key === contentKey;
    });
  }, [contentKey, tabs]);

  return (
    <div className={classes.container}>
      <NavBar newNotifs={newNotifs} setContentKey={setContentKey} />
      <Sidebar tabs={tabs} callback={setContentKey} selected={contentKey} />
      <main className={classes.content}>
        <div className={classes.spacer} />
        {content.component}
      </main>
    </div>
  );
}

export default memo(DashboardLayout);
