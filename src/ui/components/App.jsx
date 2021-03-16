import './app.css';
import React from 'react';
import Admin from './Admin';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <div className={'app'}>
      <QueryClientProvider client={queryClient}>
        <Admin />
      </QueryClientProvider>
    </div>
  );
}

export default App;
