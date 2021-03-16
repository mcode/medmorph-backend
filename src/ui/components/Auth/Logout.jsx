import React, { memo, useCallback } from 'react';
import { Button } from '@material-ui/core';
import axios from 'axios';
import { useQueryClient } from 'react-query';

const Logout = () => {
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    axios
      .post('/auth/logout', null, { withCredentials: true })
      .then(() => queryClient.invalidateQueries('authorized-user'));
  }, [queryClient]);

  return (
    <div>
      <Button variant="contained" color="secondary" onClick={logout}>
        Logout
      </Button>
    </div>
  );
};

export default memo(Logout);
