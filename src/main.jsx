import { createRoot } from 'react-dom/client'
import App from './App'
createRoot(document.getElementById('root')).render(<App />)
import { useStore } from './store'
window.__store = useStore
