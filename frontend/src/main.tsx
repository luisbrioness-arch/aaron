import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.tsx';
import { initDebugMode } from './lib/debug-mode';
import './index.css';

// A nivel de módulo a propósito, no en un useEffect — initDebugMode()
// solo lee la URL/sessionStorage una vez al cargar la página, no depende
// del ciclo de vida de React ni de qué ruta esté activa (D-31).
initDebugMode();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
