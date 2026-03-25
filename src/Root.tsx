import { useEffect, useState } from 'react'

import App from './App.tsx'
import LandingPage from './LandingPage.tsx'

function getRoute() {
  return window.location.hash.startsWith('#/app') ? 'app' : 'landing'
}

export default function Root() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRoute())
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return route === 'app' ? <App /> : <LandingPage />
}
