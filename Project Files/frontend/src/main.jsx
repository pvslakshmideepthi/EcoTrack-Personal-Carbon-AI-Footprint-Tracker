import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx'
import './index.css' // Ensure you have Tailwind directives in this file

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
