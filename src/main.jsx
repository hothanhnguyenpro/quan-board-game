import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import OfflineStatus from './components/OfflineStatus.jsx';
import './index.css';
import { registerServiceWorker } from './utils/registerServiceWorker.js';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử #root.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
    <OfflineStatus />
  </StrictMode>
);

registerServiceWorker();
