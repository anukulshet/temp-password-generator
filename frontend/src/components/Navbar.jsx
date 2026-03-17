import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <Link to="/dashboard" className="text-xl font-bold text-indigo-600">
        AccessOS
      </Link>

      {user && (
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Resources
          </Link>
          <Link to="/audit" className="text-sm text-gray-600 hover:text-gray-900">
            Audit Log
          </Link>
          <span className="text-sm text-gray-400">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
