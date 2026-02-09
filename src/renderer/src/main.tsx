
import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

console.log('Main.tsx executing...')

try {
  const root = document.getElementById('root')
  console.log('Root element:', root)

  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
    console.log('React render called')
  } else {
    console.error('Root element not found!')
  }
} catch (e) {
  console.error('React mounting failed:', e)
}
