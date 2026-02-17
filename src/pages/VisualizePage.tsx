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

  // Composite the slab image onto the masked area
  const compositeSlab = async (
    referenceImgUrl: string,
    slabImgUrl: string,
    maskUrl: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas context not available');

      const refImg = new Image();
      refImg.crossOrigin = 'anonymous';
      
      refImg.onload = () => {
        canvas.width = refImg.width;
        canvas.height = refImg.height;
        
        // Draw original image
        ctx.drawImage(refImg, 0, 0);
        
        const slabImg = new Image();
        slabImg.crossOrigin = 'anonymous';
        
        slabImg.onload = () => {
          const maskImg = new Image();
          
          maskImg.onload = () => {
            // Create pattern from slab image
            const pattern = ctx.createPattern(slabImg, 'repeat');
            if (!pattern) return reject('Pattern creation failed');
            
            // Get mask data to know where to paint
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const maskCtx = maskCanvas.getContext('2d');
            if (!maskCtx) return reject('Mask context failed');
            
            maskCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
            const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Draw slab texture where mask is white
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Scale slab to a reasonable tile size
            const tileCanvas = document.createElement('canvas');
            const tileSize = Math.min(canvas.width, canvas.height) / 3; // Adjust scale
            tileCanvas.width = tileSize;
            tileCanvas.height = tileSize;
            const tileCtx = tileCanvas.getContext('2d');
            if (!tileCtx) return reject('Tile context failed');
            
            tileCtx.drawImage(slabImg, 0, 0, tileSize, tileSize);
            const tileData = tileCtx.getImageData(0, 0, tileSize, tileSize);
            
            // Apply slab texture where mask is white
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                
                // Check if mask is white at this pixel (painted area)
                if (maskData.data[idx] > 128) {
                  // Get corresponding pixel from tiled slab
                  const tileX = x % tileSize;
                  const tileY = y % tileSize;
                  const tileIdx = (tileY * tileSize + tileX) * 4;
                  
                  // Copy slab pixel color
                  imageData.data[idx] = tileData.data[tileIdx];
                  imageData.data[idx + 1] = tileData.data[tileIdx + 1];
                  imageData.data[idx + 2] = tileData.data[tileIdx + 2];
                  imageData.data[idx + 3] = 255;
                }
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
          };
          
          maskImg.onerror = () => reject('Mask image load failed');
          maskImg.src = maskUrl;
        };
        
        slabImg.onerror = () => reject('Slab image load failed');
        slabImg.src = slabImgUrl;
      };
      
      refImg.onerror = () => reject('Reference image load failed');
      refImg.src = referenceImgUrl;
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

      console.log('Compositing slab onto image...');
      
      // Step 1: Composite slab onto masked area
      const compositedDataUrl = await compositeSlab(
        referencePreview,
        selectedSlab.image_url,
        maskDataUrl
      );

      // Upload composited image
      const compositedBlob = await (await fetch(compositedDataUrl)).blob();
      const compositedFileName = `public/${Date.now()}-composited.jpg`;
      
      const { error: compositedUploadError } = await supabase.storage
        .from('project-images')
        .upload(compositedFileName, compositedBlob);

      if (compositedUploadError) throw compositedUploadError;

      const { data: { publicUrl: compositedUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(compositedFileName);

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

      const slabType = SLAB_TYPES.find((t) => t.value === selectedSlab.type);
      const visualDesc = (selectedSlab as any).visual_description || slabType?.prompt || '';
      const prompt = `Refine lighting and shadows for ${selectedSlab.name} ${selectedSlab.type} countertop. ${visualDesc}`;

      console.log('Sending to AI for lighting refinement...');

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
                    <span>PNG, JPG up to 10MB</span>
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
              {generating ? (
                <>
                  <span className="loading" />
                  Generating with exact slab...
                </>
              ) : (
                'Generate Visualization'
              )}
            </button>

            {referencePreview && !maskDataUrl && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', textAlign: 'center', marginTop: 'var(--spacing-sm)' }}>
                ⚠️ Paint the countertops before generating
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
