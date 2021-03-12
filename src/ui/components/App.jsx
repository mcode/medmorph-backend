import './app.css';
import React from 'react';
import Admin from './Admin';
import { QueryCache, ReactQueryCacheProvider } from 'react-query';

const cache = new QueryCache();

function App() {
  return (
    <div className={'app'}>
      <ReactQueryCacheProvider queryCache={cache}>
        <Admin />
      </ReactQueryCacheProvider>
    </div>
  );
}

export default App;
