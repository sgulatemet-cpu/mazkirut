import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import PublicBooking from './pages/PublicBooking.tsx';
import './index.css';

const isBookingRoute = window.location.pathname === '/book';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isBookingRoute ? <PublicBooking /> : <App />}
  </StrictMode>
);
