import { RouterProvider } from 'react-router-dom'
import { router } from './router'

/** The app root: one data router for the whole SPA, with the shell mounted inside. */
export function App() {
  return <RouterProvider router={router} />
}
