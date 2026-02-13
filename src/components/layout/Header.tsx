import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export function Header() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-content">
        <div className="header-logo" onClick={() => navigate('/')}>
          <h2>LithoVision</h2>
        </div>

        <nav className="header-nav">
          {isAdmin && (
            <button
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              Admin
            </button>
          )}
          <button
            className={`nav-link ${location.pathname === '/visualize' ? 'active' : ''}`}
            onClick={() => navigate('/visualize')}
          >
            Visualize
          </button>
          <button
            className={`nav-link ${location.pathname === '/projects' ? 'active' : ''}`}
            onClick={() => navigate('/projects')}
          >
            My Projects
          </button>
        </nav>

        <div className="header-user">
          <span className="user-email">{profile?.email}</span>
          <button className="btn btn-sm btn-secondary" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
