import React, { memo, useCallback } from 'react';
import { Button } from '@material-ui/core';
import axios from 'axios';
import { useQueryCache } from 'react-query';

const Logout = () => {
  const cache = useQueryCache();

  const logout = useCallback(() => {
    axios
      .post('/auth/logout', null, { withCredentials: true })
      .then(() => cache.invalidateQueries('authorized-user'));
  }, [cache]);

  return (
    <div>
      <Button variant="contained" color="secondary" onClick={logout}>
        Logout
      </Button>
    </div>
  );
};

export default memo(Logout);
