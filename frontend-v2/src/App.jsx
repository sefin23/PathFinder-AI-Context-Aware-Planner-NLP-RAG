import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import { getAuthData } from './api/backend'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthData())

  // Listen for sign-out events dispatched from deep within the component tree
  // (e.g. Settings page "Sign Out" button) without needing prop drilling.
  useEffect(() => {
    const handleSignOut = () => setIsAuthenticated(false)
    window.addEventListener('pathfinder-signout', handleSignOut)
    return () => window.removeEventListener('pathfinder-signout', handleSignOut)
  }, [])

  if (!isAuthenticated) {
    return <LoginPage onAuthSuccess={() => setIsAuthenticated(true)} />
  }

  return <Dashboard />
}
