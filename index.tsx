
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { BrandingProvider } from './components/BrandingProvider';
import { Analytics } from "@vercel/analytics/react";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrandingProvider>
      <App />
      <Analytics />
    </BrandingProvider>
  </React.StrictMode>
);
