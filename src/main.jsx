import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { VoiceProvider } from './contexts/VoiceContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <VoiceProvider>
          <App />
        </VoiceProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
