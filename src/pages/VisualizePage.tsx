import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Slab } from '../types';
import { SLAB_TYPES } from '../types';
import { ComparisonSlider } from '../components/visualization/ComparisonSlider';
import './VisualizePage.css';

export function VisualizePage() {
  const { user } = useAuth();
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [selectedSlab, setSelectedSlab] = useState<Slab | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    originalUrl: string;
    generatedUrl: string;
  } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'marble' | 'granite' | 'quartzite'>('all');

  useEffect(() => {
    loadSlabs();
  }, []);

  const loadSlabs = async () => {
    try {
      const { data, error } = await supabase
        .from('slabs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSlabs(data || []);
    } catch (error) {
      console.error('Error loading slabs:', error);
    }
  };

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSlab || !referenceImage || !user || !projectName.trim()) {
      alert('Please select a slab, upload a reference image, and provide a project name.');
      return;
    }

    setGenerating(true);

    try {
      const fileExt = referenceImage.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-reference.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(fileName, referenceImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(fileName);

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          slab_id: selectedSlab.id,
          name: projectName.trim(),
          reference_image_url: publicUrl,
          status: 'processing',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      const slabType = SLAB_TYPES.find((t) => t.value === selectedSlab.type);
      const prompt = `Apply ${selectedSlab.name} ${selectedSlab.type} stone material to the countertop surfaces in this kitchen. ${slabType?.prompt}. Preserve the original scene geometry, lighting, and all other elements. Only replace the countertop material. The result must look photorealistic and professionally rendered.`;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-visualization`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          referenceImageUrl: publicUrl,
          slabImageUrl: selectedSlab.image_url,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate visualization');
      }

      const { resultUrl } = await response.json();

      await supabase
        .from('projects')
        .update({
          result_image_url: resultUrl,
          prompt_used: prompt,
          status: 'completed',
        })
        .eq('id', project.id);

      setResult({
        originalUrl: publicUrl,
        generatedUrl: resultUrl,
      });
    } catch (error) {
      console.error('Error generating visualization:', error);
      alert('Error generating visualization. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedSlab(null);
    setReferenceImage(null);
    setReferencePreview('');
    setProjectName('');
    setResult(null);
  };

  const filteredSlabs = filterType === 'all'
    ? slabs
    : slabs.filter((slab) => slab.type === filterType);

  if (result) {
    return (
      <div className="visualize-page">
        <div className="container">
          <div className="result-section">
            <div className="result-header">
              <h1>Visualization Result</h1>
              <button className="btn btn-primary" onClick={handleReset}>
                Create New Visualization
              </button>
            </div>
            <ComparisonSlider
              beforeImage={result.originalUrl}
              afterImage={result.generatedUrl}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="visualize-page">
      <div className="container">
        <h1>Create Visualization</h1>

        <div className="visualize-grid">
          <div className="visualize-section">
            <div className="section-header">
              <h2>1. Select Stone Slab</h2>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All
                </button>
                {SLAB_TYPES.map((type) => (
                  <button
                    key={type.value}
                    className={`filter-btn ${filterType === type.value ? 'active' : ''}`}
                    onClick={() => setFilterType(type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="slabs-gallery">
              {filteredSlabs.map((slab) => (
                <div
                  key={slab.id}
                  className={`gallery-item ${selectedSlab?.id === slab.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSlab(slab)}
                >
                  <img src={slab.thumbnail_url || slab.image_url} alt={slab.name} />
                  <div className="gallery-item-info">
                    <h4>{slab.name}</h4>
                    <p>{slab.type}</p>
                  </div>
                  {selectedSlab?.id === slab.id && (
                    <div className="selected-badge">Selected</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="visualize-section">
            <h2>2. Upload Reference Image</h2>
            <div className="upload-area">
              {referencePreview ? (
                <div className="preview-container">
                  <img src={referencePreview} alt="Reference" />
                  <button
                    className="btn btn-sm btn-secondary remove-btn"
                    onClick={() => {
                      setReferenceImage(null);
                      setReferencePreview('');
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceImageChange}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-content">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p>Click to upload kitchen or interior photo</p>
                    <span>PNG, JPG up to 10MB</span>
                  </div>
                </label>
              )}
            </div>

            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                className="input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Kitchen Renovation 2024"
              />
            </div>

            <button
              className="btn btn-primary btn-lg generate-btn"
              onClick={handleGenerate}
              disabled={!selectedSlab || !referenceImage || !projectName.trim() || generating}
            >
              {generating ? (
                <>
                  <span className="loading" />
                  Generating Visualization...
                </>
              ) : (
                'Generate Visualization'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
