import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-separator)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-md)',
            },
            success: { iconTheme: { primary: '#34C759', secondary: '#FFFFFF' } },
            error:   { iconTheme: { primary: '#FF3B30', secondary: '#FFFFFF' } },
          }}
        />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
