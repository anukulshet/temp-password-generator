import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Verify from './pages/Verify';

// Redirect to login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/login"     element={<Login />} />
      <Route path="/signup"    element={<Signup />} />
      <Route path="/verify"    element={<Verify />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/"          element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
