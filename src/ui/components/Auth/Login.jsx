import './auth.css';
import React, { memo, useCallback, useRef, useState } from 'react';
import { TextField, Button, Snackbar } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import axios from 'axios';
import { useQueryClient } from 'react-query';

const Login = () => {
  const queryClient = useQueryClient();
  const emailTextField = useRef();
  const passwordTextField = useRef();
  const [message, setMessage] = useState(null);

  const handleClose = useCallback(() => setMessage(null));

  const onSubmit = useCallback(() => {
    if (emailTextField.current?.value && passwordTextField.current?.value) {
      axios
        .post(
          `/auth/login`,
          {
            email: emailTextField.current.value,
            password: passwordTextField.current.value
          },
          { withCredentials: true }
        )
        .then(() => {
          queryClient.invalidateQueries('authorized-user');
        })
        .catch(err => {
          setMessage('Unable to Login');
          console.error(err);
        });
    }
  }, [queryClient]);

  return (
    <div className={'login-container'}>
      <Snackbar
        open={message !== null}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity="error">
          {message}
        </Alert>
      </Snackbar>
      <h2>Login</h2>
      <TextField
        id="email-text-field"
        inputRef={emailTextField}
        variant="outlined"
        label="email"
        className={'form-row'}
      />
      <TextField
        id="password-text-field"
        inputRef={passwordTextField}
        variant="outlined"
        type="password"
        label="password"
        className={'form-row'}
      />
      <Button variant="contained" color="primary" onClick={onSubmit} className={'form-row'}>
        Login
      </Button>
    </div>
  );
};

export default memo(Login);
