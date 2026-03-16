export interface SurfaceClassification {
  type: 'horizontal' | 'vertical' | 'angled';
  confidence: number;
  normalVector: { x: number; y: number; z: number };
}

export async function classifySurface(
  imageData: ImageData,
  maskData: ImageData
): Promise<SurfaceClassification> {
  const edges = detectEdges(imageData, maskData);
  const orientation = analyzeOrientation(edges);

  return {
    type: orientation.type,
    confidence: orientation.confidence,
    normalVector: orientation.normalVector,
  };
}

interface Edge {
  x: number;
  y: number;
  angle: number;
  magnitude: number;
}

function detectEdges(imageData: ImageData, maskData: ImageData): Edge[] {
  const edges: Edge[] = [];
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      if (maskData.data[idx] < 128) continue;

      const gx = (
        -1 * imageData.data[((y - 1) * width + (x - 1)) * 4] +
        1 * imageData.data[((y - 1) * width + (x + 1)) * 4] +
        -2 * imageData.data[(y * width + (x - 1)) * 4] +
        2 * imageData.data[(y * width + (x + 1)) * 4] +
        -1 * imageData.data[((y + 1) * width + (x - 1)) * 4] +
        1 * imageData.data[((y + 1) * width + (x + 1)) * 4]
      );

      const gy = (
        -1 * imageData.data[((y - 1) * width + (x - 1)) * 4] +
        -2 * imageData.data[((y - 1) * width + x) * 4] +
        -1 * imageData.data[((y - 1) * width + (x + 1)) * 4] +
        1 * imageData.data[((y + 1) * width + (x - 1)) * 4] +
        2 * imageData.data[((y + 1) * width + x) * 4] +
        1 * imageData.data[((y + 1) * width + (x + 1)) * 4]
      );

      const magnitude = Math.sqrt(gx * gx + gy * gy);

      if (magnitude > 30) {
        edges.push({
          x,
          y,
          angle: Math.atan2(gy, gx),
          magnitude,
        });
      }
    }
  }

  return edges;
}

function analyzeOrientation(edges: Edge[]): {
  type: 'horizontal' | 'vertical' | 'angled';
  confidence: number;
  normalVector: { x: number; y: number; z: number };
} {
  if (edges.length === 0) {
    return {
      type: 'horizontal',
      confidence: 0.5,
      normalVector: { x: 0, y: -1, z: 0 },
    };
  }

  let horizontalScore = 0;
  let verticalScore = 0;
  let angledScore = 0;

  edges.forEach((edge) => {
    const normalizedAngle = ((edge.angle + Math.PI) % Math.PI);
    const weight = edge.magnitude / 255;

    if (normalizedAngle < Math.PI / 6 || normalizedAngle > 5 * Math.PI / 6) {
      horizontalScore += weight;
    } else if (normalizedAngle > Math.PI / 3 && normalizedAngle < 2 * Math.PI / 3) {
      verticalScore += weight;
    } else {
      angledScore += weight;
    }
  });

  const total = horizontalScore + verticalScore + angledScore;
  horizontalScore /= total;
  verticalScore /= total;
  angledScore /= total;

  let type: 'horizontal' | 'vertical' | 'angled';
  let confidence: number;
  let normalVector: { x: number; y: number; z: number };

  if (horizontalScore > verticalScore && horizontalScore > angledScore) {
    type = 'horizontal';
    confidence = horizontalScore;
    normalVector = { x: 0, y: -1, z: 0 };
  } else if (verticalScore > angledScore) {
    type = 'vertical';
    confidence = verticalScore;
    normalVector = { x: 0, y: 0, z: 1 };
  } else {
    type = 'angled';
    confidence = angledScore;
    const avgAngle = edges.reduce((sum, e) => sum + e.angle, 0) / edges.length;
    normalVector = {
      x: Math.cos(avgAngle),
      y: Math.sin(avgAngle),
      z: 0.5,
    };
  }

  return { type, confidence, normalVector };
}
