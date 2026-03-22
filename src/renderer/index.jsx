import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import LicenseGate from './components/LicenseGate';
import './styles/App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LicenseGate>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LicenseGate>
  </React.StrictMode>
);
