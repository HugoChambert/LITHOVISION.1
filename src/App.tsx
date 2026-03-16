import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/layout/Header';
import { AdminPage } from './pages/AdminPage';
import { VisualizePage } from './pages/VisualizePage';
import { ProjectsPage } from './pages/ProjectsPage';

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Header />
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/visualize" element={<VisualizePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/" element={<Navigate to="/visualize" />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
