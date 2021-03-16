import React, { memo } from 'react';
import useAuthorizedUser from '../../hooks/useAuthorizedUser';
import { Login, Logout } from '../Auth';

const Admin = () => {
  const { error: authError, data: user } = useAuthorizedUser();
  const isAuthorized = !authError && user !== undefined;

  return (
    <>
      {!isAuthorized && <Login />}
      {isAuthorized && (
        <div>
          User: {user.uid}
          <Logout />
        </div>
      )}
    </>
  );
};

export default memo(Admin);
