import React, { memo } from 'react';
import useAuthorizedUser from '../../hooks/useAuthorizedUser';
import { Login, Logout } from '../Auth';
import Collections from '../Collections';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@material-ui/core/styles';
import theme from '../styles/theme';
const Admin = () => {
  const { error: authError, data: user } = useAuthorizedUser();
  const isAuthorized = !authError && user !== undefined;

  return (
    <>
      {!isAuthorized && <Login />}
      {isAuthorized && (
        <div>
          <ThemeProvider theme={theme}>
            <Dashboard />
          </ ThemeProvider>
        </div>
      )}
    </>
  );
};

export default memo(Admin);
