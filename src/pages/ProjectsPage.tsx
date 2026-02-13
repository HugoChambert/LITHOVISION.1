import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, Slab } from '../types';
import { ComparisonSlider } from '../components/visualization/ComparisonSlider';
import './ProjectsPage.css';

type ProjectWithSlab = Project & {
  slabs: Slab | null;
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectWithSlab | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          slabs (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      pending: 'status-badge status-pending',
      processing: 'status-badge status-processing',
      completed: 'status-badge status-completed',
      failed: 'status-badge status-failed',
    };
    return classes[status as keyof typeof classes] || 'status-badge';
  };

  if (selectedProject && selectedProject.result_image_url) {
    return (
      <div className="projects-page">
        <div className="container">
          <div className="project-detail">
            <div className="project-detail-header">
              <div>
                <h1>{selectedProject.name}</h1>
                <p className="project-meta">
                  {selectedProject.slabs?.name} • {selectedProject.slabs?.type}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedProject(null)}>
                Back to Projects
              </button>
            </div>
            <ComparisonSlider
              beforeImage={selectedProject.reference_image_url}
              afterImage={selectedProject.result_image_url}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="container">
        <h1>My Projects</h1>

        {loading ? (
          <div className="loading-container">
            <span className="loading" />
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <h2>No projects yet</h2>
            <p>Create your first visualization to see it here.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card">
                <div
                  className="project-thumbnail"
                  onClick={() => project.status === 'completed' && setSelectedProject(project)}
                  style={{ cursor: project.status === 'completed' ? 'pointer' : 'default' }}
                >
                  <img
                    src={project.result_image_url || project.reference_image_url}
                    alt={project.name}
                  />
                  {project.status !== 'completed' && (
                    <div className="overlay">
                      <span className={getStatusBadge(project.status)}>
                        {project.status}
                      </span>
                    </div>
                  )}
                </div>
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <p className="project-slab">
                    {project.slabs?.name} • {project.slabs?.type}
                  </p>
                  <p className="project-date">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="project-actions">
                  {project.status === 'completed' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setSelectedProject(project)}
                    >
                      View
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
