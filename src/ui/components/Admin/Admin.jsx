import React, { memo } from 'react';
import useAuthorizedUser from '../../hooks/useAuthorizedUser';
import { Login, Logout } from '../Auth';
import Collections from '../Collections';

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
          <Collections />
        </div>
      )}
    </>
  );
};

export default memo(Admin);
