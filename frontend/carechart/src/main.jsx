import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Unregister any cached service workers so clinical staff always get the latest build
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister())
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
