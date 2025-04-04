
// Import the React library,ReactDOM library, and the main App component
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Get the DOM element with the ID: root
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component inside the React.StrictMode wrapper
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



