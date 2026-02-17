import { useRef, useState, useCallback } from 'react';
import './MaskPainter.css';

interface MaskPainterProps {
  imageUrl: string;
  onMaskChange: (maskDataUrl: string) => void;
}

export function MaskPainter({ imageUrl, onMaskChange }: MaskPainterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const exportMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 10) {
        maskData.data[i] = 255;
        maskData.data[i + 1] = 255;
        maskData.data[i + 2] = 255;
        maskData.data[i + 3] = 255;
      }
    }

    maskCtx.putImageData(maskData, 0, 0);
    onMaskChange(maskCanvas.toDataURL('image/png'));
  }, [onMaskChange]);

  const paint = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(255, 50, 50, 0.65)';

    if (lastPos.current) {
      const dist = Math.hypot(x - lastPos.current.x, y - lastPos.current.y);
      const steps = Math.max(1, Math.floor(dist / 3));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ix = lastPos.current.x + (x - lastPos.current.x) * t;
        const iy = lastPos.current.y + (y - lastPos.current.y) * t;
        ctx.beginPath();
        ctx.arc(ix, iy, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    lastPos.current = { x, y };
    exportMask();
  }, [brushSize, exportMask]);

  const handleImageLoad = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onMaskChange('');
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    lastPos.current = null;
    const pos = getPos(e.nativeEvent);
    if (pos) paint(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPos(e.nativeEvent);
    if (pos) paint(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = null;
    const pos = getPos(e.nativeEvent);
    if (pos) paint(pos.x, pos.y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e.nativeEvent);
    if (pos) paint(pos.x, pos.y);
  };

  return (
    <div className="mask-painter">
      <div className="mask-painter-controls">
        <span className="paint-instruction">🖌️ Paint over your countertops</span>
        <div className="brush-controls">
          <span>Brush:</span>
          <button className={`brush-btn ${brushSize === 15 ? 'active' : ''}`} onClick={() => setBrushSize(15)}>S</button>
          <button className={`brush-btn ${brushSize === 30 ? 'active' : ''}`} onClick={() => setBrushSize(30)}>M</button>
          <button className={`brush-btn ${brushSize === 50 ? 'active' : ''}`} onClick={() => setBrushSize(50)}>L</button>
          <button className="btn btn-sm btn-secondary" onClick={clearCanvas}>Clear</button>
        </div>
      </div>
      <div className="canvas-wrapper">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Reference"
          className="canvas-bg-image"
          onLoad={handleImageLoad}
        />
        <canvas
          ref={canvasRef}
          className="paint-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        />
      </div>
      <p className="mask-hint">Paint red over every countertop surface, then click Generate</p>
    </div>
  );
}
