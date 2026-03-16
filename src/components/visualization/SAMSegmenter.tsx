import { useState, useRef, useEffect } from 'react';
import './SAMSegmenter.css';

interface SAMSegmenterProps {
  imageUrl: string;
  onMaskGenerated: (maskDataUrl: string) => void;
}

export function SAMSegmenter({ imageUrl, onMaskGenerated }: SAMSegmenterProps) {
  const [points, setPoints] = useState<{ x: number; y: number; type: 'positive' | 'negative' }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [maskPreview, setMaskPreview] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState<'positive' | 'negative'>('positive');

  useEffect(() => {
    loadImage();
  }, [imageUrl]);

  const loadImage = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        setImageSize({ width: img.width, height: img.height });

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          redrawPoints(ctx);
        }
      }
    };
    img.src = imageUrl;
  };

  const redrawPoints = (ctx: CanvasRenderingContext2D) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(img, 0, 0);

      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = point.type === 'positive' ? '#00ff00' : '#ff0000';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };
    img.src = imageUrl;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newPoint = { x, y, type: mode };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      redrawPoints(ctx);
    }
  };

  const handleGenerateMask = async () => {
    if (points.length === 0) {
      alert('Please add at least one point');
      return;
    }

    setIsGenerating(true);

    try {
      const positivePoints = points.filter(p => p.type === 'positive');
      const negativePoints = points.filter(p => p.type === 'negative');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sam-mask`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          positivePoints: positivePoints.map(p => ({ x: p.x, y: p.y })),
          negativePoints: negativePoints.map(p => ({ x: p.x, y: p.y })),
          imageWidth: imageSize.width,
          imageHeight: imageSize.height,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate mask');
      }

      const { maskUrl } = await response.json();
      setMaskPreview(maskUrl);
      onMaskGenerated(maskUrl);
    } catch (error) {
      console.error('Error generating mask:', error);
      alert('Failed to generate mask. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearPoints = () => {
    setPoints([]);
    setMaskPreview('');
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      redrawPoints(ctx);
    }
  };

  return (
    <div className="sam-segmenter">
      <div className="sam-controls">
        <div className="mode-selector">
          <button
            className={`mode-btn ${mode === 'positive' ? 'active positive' : ''}`}
            onClick={() => setMode('positive')}
          >
            Include (Green)
          </button>
          <button
            className={`mode-btn ${mode === 'negative' ? 'active negative' : ''}`}
            onClick={() => setMode('negative')}
          >
            Exclude (Red)
          </button>
        </div>

        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={handleGenerateMask}
            disabled={isGenerating || points.length === 0}
          >
            {isGenerating ? (
              <>
                <span className="loading" />
                Generating Mask...
              </>
            ) : (
              'Generate Mask'
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClearPoints}
            disabled={points.length === 0}
          >
            Clear Points
          </button>
        </div>
      </div>

      <div className="sam-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="sam-canvas"
        />
        {maskPreview && (
          <img
            src={maskPreview}
            alt="Mask preview"
            className="mask-overlay"
          />
        )}
      </div>

      <div className="sam-instructions">
        <p>
          <strong>Instructions:</strong> Click on the countertop surfaces to select them.
          Use green points to include areas and red points to exclude unwanted areas.
        </p>
        <p className="point-count">
          Points added: {points.filter(p => p.type === 'positive').length} include,
          {' '}{points.filter(p => p.type === 'negative').length} exclude
        </p>
      </div>
    </div>
  );
}
