import './app.css';
import React from 'react';
import Auth from './Auth';
import { UserProvider } from './UserProvider';

function App() {
  return (
    <div className={'app'}>
      <UserProvider>
        <Auth />
      </UserProvider>
    </div>
  );
}

export default App;
