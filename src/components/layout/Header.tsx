import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="header">
      <div className="container header-content">
        <div className="header-logo" onClick={() => navigate('/')}>
          <h2>LithoVision</h2>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
          >
            Admin
          </button>
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
            Projects
          </button>
        </nav>
      </div>
    </header>
  );
}
