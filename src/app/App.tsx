import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'

/** The app root: one router for the whole SPA, with the shell mounted inside. */
export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
