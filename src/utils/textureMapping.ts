import { PerspectiveTransform } from './perspectiveEstimation';
import { SurfaceClassification } from './surfaceClassification';

export interface TextureMappingResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
}

export async function applyTextureMapping(
  referenceImage: string,
  slabImage: string,
  maskDataUrl: string,
  perspective: PerspectiveTransform,
  surface: SurfaceClassification
): Promise<TextureMappingResult> {
  const [refImg, slabImg, maskImg] = await Promise.all([
    loadImage(referenceImage),
    loadImage(slabImage),
    loadImage(maskDataUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = refImg.width;
  canvas.height = refImg.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context failed');

  ctx.drawImage(refImg, 0, 0);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) throw new Error('Mask context failed');

  maskCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
  const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);

  const slabCanvas = document.createElement('canvas');
  const slabSize = 512;
  slabCanvas.width = slabSize;
  slabCanvas.height = slabSize;
  const slabCtx = slabCanvas.getContext('2d', { willReadFrequently: true });
  if (!slabCtx) throw new Error('Slab context failed');

  slabCtx.drawImage(slabImg, 0, 0, slabSize, slabSize);
  const slabData = slabCtx.getImageData(0, 0, slabSize, slabSize);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  applyPerspectiveTextureMapping(
    imageData,
    maskData,
    slabData,
    perspective,
    surface
  );

  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  return { canvas, dataUrl };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function applyPerspectiveTextureMapping(
  imageData: ImageData,
  maskData: ImageData,
  slabData: ImageData,
  perspective: PerspectiveTransform,
  surface: SurfaceClassification
) {
  const width = imageData.width;
  const height = imageData.height;
  const slabSize = slabData.width;

  const scaleFactorX = surface.type === 'vertical' ? 1.5 : 1.0;
  const scaleFactorY = surface.type === 'horizontal' ? 1.2 : 1.0;

  const perspectiveStrength = 0.3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      if (maskData.data[idx] < 128) continue;

      let texX = x;
      let texY = y;

      if (perspective.vanishingPoints.length > 0) {
        const vp = perspective.vanishingPoints[0];
        const dx = x - vp.x;
        const dy = y - vp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          const warpFactor = perspectiveStrength * (1 - Math.exp(-dist / 1000));
          texX += dx * warpFactor * 0.1;
          texY += dy * warpFactor * 0.1;
        }
      }

      texX *= scaleFactorX;
      texY *= scaleFactorY;

      const slabX = Math.floor(Math.abs(texX) % slabSize);
      const slabY = Math.floor(Math.abs(texY) % slabSize);
      const slabIdx = (slabY * slabSize + slabX) * 4;

      imageData.data[idx] = slabData.data[slabIdx];
      imageData.data[idx + 1] = slabData.data[slabIdx + 1];
      imageData.data[idx + 2] = slabData.data[slabIdx + 2];
      imageData.data[idx + 3] = 255;
    }
  }
}
