import { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import './ComparisonSlider.css';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
}

export function ComparisonSlider({ beforeImage, afterImage }: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchend', handleGlobalTouchEnd);

      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [isDragging]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const bounded = Math.max(0, Math.min(100, percentage));
    setSliderPosition(bounded);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    }
  };

  if (showZoom) {
    return (
      <div className="comparison-slider-zoom">
        <div className="zoom-controls">
          <button className="btn btn-secondary" onClick={() => setShowZoom(false)}>
            Exit Zoom
          </button>
        </div>
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
          doubleClick={{ mode: 'zoomIn', step: 0.5 }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: 'calc(100vh - 200px)' }}
            contentStyle={{ width: '100%', height: '100%' }}
          >
            <div className="zoom-content">
              <img src={afterImage} alt="After" className="zoom-image" />
              <div
                className="zoom-before-overlay"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img src={beforeImage} alt="Before" className="zoom-image" />
              </div>
              <div
                className="slider-control"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                <div className="slider-line" />
                <div className="slider-handle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                  </svg>
                </div>
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
    );
  }

  return (
    <div>
      <div className="comparison-toolbar">
        <button className="btn btn-sm btn-secondary" onClick={() => setShowZoom(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          Zoom & Pan
        </button>
      </div>
      <div
        ref={containerRef}
        className="comparison-slider"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        <div className="comparison-labels">
          <span className="label-before">Before</span>
          <span className="label-after">After</span>
        </div>

        <div className="comparison-images">
          <img src={afterImage} alt="After" className="image-after" />
          <div
            className="image-before-container"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img src={beforeImage} alt="Before" className="image-before" />
          </div>
        </div>

        <div
          className="slider-control"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="slider-line" />
          <div className="slider-handle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
