import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import CustomThemeProvider from './CustomThemeProvider.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>
  </React.StrictMode>
);