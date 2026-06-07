import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}