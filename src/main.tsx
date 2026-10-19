import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { App } from './App'
import { initApp } from './lib/init'

// Für Screenshots am Desktop: iPhone-Safe-Areas simulieren (?sim=iphone)
if (new URLSearchParams(location.search).has('sim') || localStorage.getItem('repwise.sim') === 'iphone') {
  document.documentElement.classList.add('sim-iphone')
}

initApp()
if (import.meta.env.DEV) import('./lib/dev').then((m) => m.installDevTools())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
