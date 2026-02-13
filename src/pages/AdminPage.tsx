import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Slab } from '../types';
import { SLAB_TYPES } from '../types';
import './AdminPage.css';

export function AdminPage() {
  const { isAdmin } = useAuth();
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlab, setEditingSlab] = useState<Slab | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'marble' as 'marble' | 'granite' | 'quartzite',
    description: '',
    image: null as File | null,
  });

  useEffect(() => {
    if (isAdmin) {
      loadSlabs();
    }
  }, [isAdmin]);

  const loadSlabs = async () => {
    try {
      const { data, error } = await supabase
        .from('slabs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSlabs(data || []);
    } catch (error) {
      console.error('Error loading slabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = editingSlab?.image_url || '';

      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('slab-images')
          .upload(filePath, formData.image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('slab-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      if (editingSlab) {
        const { error } = await supabase
          .from('slabs')
          .update({
            name: formData.name,
            type: formData.type,
            description: formData.description,
            image_url: imageUrl,
            thumbnail_url: imageUrl,
          })
          .eq('id', editingSlab.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('slabs')
          .insert({
            name: formData.name,
            type: formData.type,
            description: formData.description,
            image_url: imageUrl,
            thumbnail_url: imageUrl,
          });

        if (error) throw error;
      }

      setFormData({ name: '', type: 'marble', description: '', image: null });
      setShowForm(false);
      setEditingSlab(null);
      loadSlabs();
    } catch (error) {
      console.error('Error saving slab:', error);
      alert('Error saving slab. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (slab: Slab) => {
    setEditingSlab(slab);
    setFormData({
      name: slab.name,
      type: slab.type,
      description: slab.description,
      image: null,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slab?')) return;

    try {
      const { error } = await supabase
        .from('slabs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadSlabs();
    } catch (error) {
      console.error('Error deleting slab:', error);
      alert('Error deleting slab. Please try again.');
    }
  };

  const toggleActive = async (slab: Slab) => {
    try {
      const { error } = await supabase
        .from('slabs')
        .update({ is_active: !slab.is_active })
        .eq('id', slab.id);

      if (error) throw error;
      loadSlabs();
    } catch (error) {
      console.error('Error toggling slab status:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div className="card">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="container">
        <div className="admin-header">
          <h1>Slab Inventory Management</h1>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingSlab(null);
              setFormData({ name: '', type: 'marble', description: '', image: null });
            }}
          >
            Add New Slab
          </button>
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingSlab ? 'Edit Slab' : 'Add New Slab'}</h2>
              <form onSubmit={handleSubmit} className="slab-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <select
                    className="input"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as 'marble' | 'granite' | 'quartzite',
                      })
                    }
                  >
                    {SLAB_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Image {editingSlab && '(leave empty to keep current)'}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.files?.[0] || null })
                    }
                    required={!editingSlab}
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? <span className="loading" /> : editingSlab ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <span className="loading" />
          </div>
        ) : (
          <div className="slabs-grid">
            {slabs.map((slab) => (
              <div key={slab.id} className={`slab-card ${!slab.is_active ? 'inactive' : ''}`}>
                <div className="slab-image">
                  <img src={slab.image_url} alt={slab.name} />
                  {!slab.is_active && <div className="inactive-badge">Inactive</div>}
                </div>
                <div className="slab-info">
                  <h3>{slab.name}</h3>
                  <p className="slab-type">{slab.type}</p>
                  <p className="slab-description">{slab.description}</p>
                </div>
                <div className="slab-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(slab)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => toggleActive(slab)}
                  >
                    {slab.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(slab.id)}>
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
