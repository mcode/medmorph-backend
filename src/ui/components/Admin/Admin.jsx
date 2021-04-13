import React, { memo } from 'react';
import useAuthorizedUser from '../../hooks/useAuthorizedUser';
import { Login } from '../Auth';
import DashboardLayout from '../Dashboard';
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
            <DashboardLayout />
          </ThemeProvider>
        </div>
      )}
    </>
  );
};

export default memo(Admin);
