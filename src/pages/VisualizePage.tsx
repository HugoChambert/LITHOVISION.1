import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Slab } from '../types';
import { SLAB_TYPES } from '../types';
import { ComparisonSlider } from '../components/visualization/ComparisonSlider';
import { MaskPainter } from '../components/visualization/MaskPainter';
import './VisualizePage.css';

export function VisualizePage() {
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [selectedSlab, setSelectedSlab] = useState<Slab | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string>('');
  const [maskDataUrl, setMaskDataUrl] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [compositing, setCompositing] = useState(false);
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
      setMaskDataUrl('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Composite EXACT slab texture onto masked area
  const compositeExactSlab = async (
    referenceDataUrl: string,
    slabImgUrl: string,
    maskUrl: string
  ): Promise<Blob> => {
    console.log('Compositing your EXACT slab texture...');
    
    const [refImg, slabImg, maskImg] = await Promise.all([
      loadImage(referenceDataUrl),
      loadImage(slabImgUrl),
      loadImage(maskUrl)
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = refImg.width;
    canvas.height = refImg.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context failed');

    // Draw original image
    ctx.drawImage(refImg, 0, 0);

    // Get mask data
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) throw new Error('Mask context failed');
    
    maskCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);

    // Prepare slab tile
    const tileSize = Math.max(300, Math.min(canvas.width, canvas.height) / 3);
    const slabCanvas = document.createElement('canvas');
    slabCanvas.width = tileSize;
    slabCanvas.height = tileSize;
    const slabCtx = slabCanvas.getContext('2d', { willReadFrequently: true });
    if (!slabCtx) throw new Error('Slab context failed');
    
    slabCtx.drawImage(slabImg, 0, 0, tileSize, tileSize);
    const slabData = slabCtx.getImageData(0, 0, tileSize, tileSize);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply EXACT slab texture where mask is white
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        
        if (maskData.data[idx] > 128) {
          const slabX = x % tileSize;
          const slabY = y % tileSize;
          const slabIdx = (slabY * tileSize + slabX) * 4;
          
          // Copy exact slab pixel colors
          imageData.data[idx] = slabData.data[slabIdx];
          imageData.data[idx + 1] = slabData.data[slabIdx + 1];
          imageData.data[idx + 2] = slabData.data[slabIdx + 2];
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    console.log('Exact slab texture applied!');

    // Resize to max 1024px to avoid GPU memory issues
    const maxSize = 1024;
    let finalCanvas = canvas;
    
    if (canvas.width > maxSize || canvas.height > maxSize) {
      console.log(`Resizing from ${canvas.width}x${canvas.height} to fit ${maxSize}px`);
      const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
      const newWidth = Math.floor(canvas.width * scale);
      const newHeight = Math.floor(canvas.height * scale);
      
      finalCanvas = document.createElement('canvas');
      finalCanvas.width = newWidth;
      finalCanvas.height = newHeight;
      const finalCtx = finalCanvas.getContext('2d');
      if (finalCtx) {
        finalCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
      }
      console.log(`Resized to ${newWidth}x${newHeight}`);
    }

    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', 0.92);
    });
  };

  const handleGenerate = async () => {
    if (!selectedSlab || !referenceImage || !projectName.trim()) {
      alert('Please select a slab, upload a reference image, and provide a project name.');
      return;
    }

    if (!maskDataUrl) {
      alert('Please paint over the countertop areas before generating.');
      return;
    }

    setGenerating(true);
    setCompositing(true);

    try {
      // Upload original reference
      const fileExt = referenceImage.name.split('.').pop();
      const fileName = `public/${Date.now()}-reference.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(fileName, referenceImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl: originalUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(fileName);

      console.log('Step 1: Compositing your exact slab...');
      
      // Composite exact slab texture
      const compositedBlob = await compositeExactSlab(
        referencePreview,
        selectedSlab.image_url,
        maskDataUrl
      );

      setCompositing(false);

      // Upload composited image
      const compositedFileName = `public/${Date.now()}-composited.jpg`;
      const { error: compositedUploadError } = await supabase.storage
        .from('project-images')
        .upload(compositedFileName, compositedBlob);

      if (compositedUploadError) throw compositedUploadError;

      const { data: { publicUrl: compositedUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(compositedFileName);

      console.log('Step 2: AI adjusting lighting only...');

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: null,
          slab_id: selectedSlab.id,
          name: projectName.trim(),
          reference_image_url: originalUrl,
          status: 'processing',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Send to AI for lighting adjustment ONLY
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-visualization`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          compositedImageUrl: compositedUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lighting adjustment error:', errorText);
        throw new Error('Failed to adjust lighting');
      }

      const { resultUrl } = await response.json();

      await supabase
        .from('projects')
        .update({
          result_image_url: resultUrl,
          prompt_used: `Exact slab composite + lighting: ${selectedSlab.name}`,
          status: 'completed',
        })
        .eq('id', project.id);

      setResult({
        originalUrl: originalUrl,
        generatedUrl: resultUrl,
      });

      console.log('Complete! Exact slab with realistic lighting applied.');

    } catch (error) {
      console.error('Error generating visualization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${errorMessage}`);
    } finally {
      setGenerating(false);
      setCompositing(false);
    }
  };

  const handleReset = () => {
    setSelectedSlab(null);
    setReferenceImage(null);
    setReferencePreview('');
    setMaskDataUrl('');
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
            <h2>2. Upload &amp; Paint Countertops</h2>

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
                    <span>Your exact slab will be applied</span>
                  </div>
                </label>
              </div>
            ) : (
              <MaskPainter
                imageUrl={referencePreview}
                onMaskChange={setMaskDataUrl}
              />
            )}

            {referencePreview && (
              <button
                className="btn btn-sm btn-secondary"
                style={{ marginBottom: 'var(--spacing-md)' }}
                onClick={() => {
                  setReferenceImage(null);
                  setReferencePreview('');
                  setMaskDataUrl('');
                }}
              >
                Change Photo
              </button>
            )}

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
              disabled={!selectedSlab || !referenceImage || !projectName.trim() || !maskDataUrl || generating}
            >
              {compositing ? (
                <>
                  <span className="loading" />
                  Applying your exact slab...
                </>
              ) : generating ? (
                <>
                  <span className="loading" />
                  Adjusting lighting...
                </>
              ) : (
                'Generate with Exact Slab'
              )}
            </button>

            {referencePreview && !maskDataUrl && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', textAlign: 'center', marginTop: 'var(--spacing-sm)' }}>
                ⚠️ Paint the countertops before generating
              </p>
            )}

            {selectedSlab && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 'var(--spacing-sm)', fontStyle: 'italic' }}>
                💎 Using exact texture from: {selectedSlab.name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
