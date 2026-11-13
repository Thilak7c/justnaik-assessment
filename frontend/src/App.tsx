import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './auth/RouteGuards'
import { Layout } from './components/Layout'
import { AuthPage } from './pages/AuthPage'
import { MapPage } from './pages/MapPage'
import { UploadPage } from './pages/UploadPage'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/map" element={<MapPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/map" replace />} />
      <Route
        path="*"
        element={
          <div className="p-8 text-center">
            <p className="mb-2 text-lg font-semibold">Page not found</p>
            <Link to="/map" className="text-blue-600 hover:underline">
              Go to the map
            </Link>
          </div>
        }
      />
    </Routes>
  )
}
