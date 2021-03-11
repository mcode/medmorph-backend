import './auth.css';
import React, { memo, useCallback, useRef } from 'react';
import { TextField, Button } from '@material-ui/core';
import axios from 'axios';

const Auth = () => {
  const emailTextField = useRef();
  const passwordTextField = useRef();

  const onSubmit = useCallback(() => {
    if (emailTextField.current?.value && passwordTextField.current?.value) {
      axios
        .post(`/auth/login`, {
          email: emailTextField.current.value,
          password: passwordTextField.current.value
        })
        .then(data => console.log(data))
        .catch(err => console.log(err));
    }
  });

  return (
    <div>
      <h2>Login</h2>
      <TextField id="email-text-field" inputRef={emailTextField} variant="outlined" label="email" />
      <TextField
        id="password-text-field"
        inputRef={passwordTextField}
        variant="outlined"
        type="password"
        label="password"
      />
      <Button variant="contained" color="primary" onClick={onSubmit}>
        Login
      </Button>
    </div>
  );
};

export default memo(Auth);
