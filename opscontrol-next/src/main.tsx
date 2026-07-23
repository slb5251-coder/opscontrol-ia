import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {RealtimeApp} from './components/RealtimeApp';
import './styles.css';
import './auth.css';
import './modules.css';
import './premium.css';
import './tv-panel.css';
import './functional.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
 <React.StrictMode><BrowserRouter><RealtimeApp/></BrowserRouter></React.StrictMode>
);
