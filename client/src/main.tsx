import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SalaProvider } from './sala/SalaContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SalaProvider>
        <App />
      </SalaProvider>
    </BrowserRouter>
  </StrictMode>,
);
