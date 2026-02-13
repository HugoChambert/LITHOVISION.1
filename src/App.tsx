import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { AdminPage } from './pages/AdminPage';
import { VisualizePage } from './pages/VisualizePage';
import { ProjectsPage } from './pages/ProjectsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/visualize" element={<VisualizePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/" element={<Navigate to="/visualize" />} />
      </Routes>
    </BrowserRouter>
  );
}
