import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import './Header.css';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        navigate('/admin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <header className="header">
      <div className="container header-content">
        <div className="header-logo" onClick={() => navigate('/')}>
          <h2>LITHOVISION</h2>
        </div>

        <nav className="header-nav">
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
