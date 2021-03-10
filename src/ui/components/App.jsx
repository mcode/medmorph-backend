import './app.css';
import React from 'react';
import Auth from './Auth/Auth.jsx';
import UserProvider from './UserProvider.jsx';
// const UserProvider = require('./UserProvider').UserProvider;

function App() {
  return (
    <div className={'app'}>
      <UserProvider>
        <Auth />
        Medmorph
      </UserProvider>
    </div>
  );
}

export default App;
