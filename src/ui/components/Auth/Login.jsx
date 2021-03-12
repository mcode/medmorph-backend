import './auth.css';
import React, { memo, useCallback, useRef } from 'react';
import { TextField, Button } from '@material-ui/core';
import axios from 'axios';
import { useQueryCache } from 'react-query';

const Login = () => {
  const cache = useQueryCache();
  const emailTextField = useRef();
  const passwordTextField = useRef();

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
          cache.invalidateQueries('authorized-user');
        })
        .catch(err => console.log(err));
    }
  }, [cache]);

  return (
    <div className={'login-container'}>
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
