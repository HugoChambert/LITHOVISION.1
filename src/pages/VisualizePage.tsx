import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Slab } from '../types';
import { SLAB_TYPES } from '../types';
import { ComparisonSlider } from '../components/visualization/ComparisonSlider';
import './VisualizePage.css';

export function VisualizePage() {
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [selectedSlab, setSelectedSlab] = useState<Slab | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string>('');
  const [detectedMask, setDetectedMask] = useState<string>('');
  const [detecting, setDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string>('');
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

  const handleReferenceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      setDetectedMask('');
      setDetectionError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-detect countertop
      await detectCountertop(file);
    }
  };

  const detectCountertop = async (file: File) => {
    setDetecting(true);
    setDetectionError('');
    
    try {
      console.log('Uploading image for detection...');
      
      // Upload image first
      const fileName = `public/${Date.now()}-detect.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(fileName);

      console.log('Image uploaded, detecting countertop with SAM...');
      console.log('Image URL:', publicUrl);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-visualization`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'detect',
          imageUrl: publicUrl,
        }),
      });

      const responseText = await response.text();
      console.log('Detection response status:', response.status);
      console.log('Detection response:', responseText.substring(0, 500));

      if (!response.ok) {
        let errorMsg = 'Detection failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorData.details || responseText;
        } catch {
          errorMsg = responseText;
        }
        throw new Error(errorMsg);
      }

      const data = JSON.parse(responseText);
      
      if (!data.maskUrl) {
        throw new Error('No mask URL in response');
      }

      setDetectedMask(data.maskUrl);
      console.log('Countertop detected successfully!');

    } catch (error) {
      console.error('Error detecting countertop:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDetectionError(`Detection failed: ${errorMessage}. Please check Edge Function logs.`);
      alert(`Could not auto-detect countertop: ${errorMessage}\n\nCheck Supabase Edge Function logs for details.`);
    } finally {
      setDetecting(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSlab || !referenceImage || !projectName.trim()) {
      alert('Please select a slab, upload a reference image, and provide a project name.');
      return;
    }

    if (!detectedMask) {
      alert('Please wait for countertop detection to complete, or upload a different photo.');
      return;
    }

    setGenerating(true);

    try {
      const fileExt = referenceImage.name.split('.').pop();
      const fileName = `public/${Date.now()}-reference.${fileExt}`;

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
          user_id: null,
          slab_id: selectedSlab.id,
          name: projectName.trim(),
          reference_image_url: publicUrl,
          status: 'processing',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      console.log('Applying slab texture...');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-visualization`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'apply',
          projectId: project.id,
          imageUrl: publicUrl,
          slabImageUrl: selectedSlab.image_url,
          maskUrl: detectedMask,
          slabName: selectedSlab.name,
          slabType: selectedSlab.type,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generation error:', errorText);
        throw new Error('Failed to generate visualization');
      }

      const { resultUrl } = await response.json();

      await supabase
        .from('projects')
        .update({
          result_image_url: resultUrl,
          prompt_used: `Auto-detected + AI: ${selectedSlab.name}`,
          status: 'completed',
        })
        .eq('id', project.id);

      setResult({
        originalUrl: publicUrl,
        generatedUrl: resultUrl,
      });

      console.log('Generation complete!');

    } catch (error) {
      console.error('Error generating visualization:', error);
      alert('Error generating visualization. Check Edge Function logs.');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedSlab(null);
    setReferenceImage(null);
    setReferencePreview('');
    setDetectedMask('');
    setDetectionError('');
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
            <h2>2. Upload Kitchen Photo</h2>

            {!referencePreview ? (
              <div className="upload-area">
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
                    <span>AI will auto-detect countertops</span>
                  </div>
                </label>
              </div>
            ) : (
              <div>
                <div className="preview-container" style={{ position: 'relative', marginBottom: 'var(--spacing-md)' }}>
                  <img src={referencePreview} alt="Reference" style={{ width: '100%', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)' }} />
                  {detecting && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.7)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-lg)',
                      color: 'white'
                    }}>
                      <span className="loading" style={{ marginBottom: 'var(--spacing-md)' }} />
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>AI detecting countertops...</p>
                      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>This may take 10-20 seconds</p>
                    </div>
                  )}
                  {detectedMask && !detecting && (
                    <div style={{
                      position: 'absolute',
                      top: 'var(--spacing-sm)',
                      right: 'var(--spacing-sm)',
                      background: 'var(--color-success)',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      ✓ Countertop Detected
                    </div>
                  )}
                  {detectionError && !detecting && (
                    <div style={{
                      position: 'absolute',
                      top: 'var(--spacing-sm)',
                      right: 'var(--spacing-sm)',
                      background: 'var(--color-danger)',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      ✗ Detection Failed
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    setReferenceImage(null);
                    setReferencePreview('');
                    setDetectedMask('');
                    setDetectionError('');
                  }}
                >
                  Change Photo
                </button>
                {detectionError && (
                  <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'rgba(255,0,0,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-danger)' }}>
                    {detectionError}
                  </div>
                )}
              </div>
            )}

            <div className="form-group" style={{ marginTop: 'var(--spacing-lg)' }}>
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
              disabled={!selectedSlab || !referenceImage || !projectName.trim() || !detectedMask || detecting || generating}
            >
              {generating ? (
                <>
                  <span className="loading" />
                  Applying slab texture...
                </>
              ) : (
                'Generate Visualization'
              )}
            </button>

            {referencePreview && !detectedMask && !detecting && !detectionError && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', textAlign: 'center', marginTop: 'var(--spacing-sm)' }}>
                ⚠️ Waiting for AI to detect countertop...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
