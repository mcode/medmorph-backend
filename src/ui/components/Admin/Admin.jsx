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
      <ThemeProvider theme={theme}>
        {!isAuthorized && <Login />}
        {isAuthorized && (
          <div>
            <DashboardLayout />
          </div>
        )}
      </ThemeProvider>
    </>
  );
};

export default memo(Admin);
