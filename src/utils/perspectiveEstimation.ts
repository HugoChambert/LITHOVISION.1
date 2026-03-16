export interface PerspectiveTransform {
  matrix: number[][];
  vanishingPoints: { x: number; y: number }[];
  focalLength: number;
}

export interface Corner {
  x: number;
  y: number;
}

export function estimatePerspective(
  maskData: ImageData,
  width: number,
  height: number
): PerspectiveTransform {
  const corners = detectCorners(maskData, width, height);
  const lines = detectLines(corners);
  const vanishingPoints = findVanishingPoints(lines);

  const focalLength = estimateFocalLength(vanishingPoints, width, height);

  const matrix = computeHomographyMatrix(corners, width, height);

  return {
    matrix,
    vanishingPoints,
    focalLength,
  };
}

function detectCorners(
  maskData: ImageData,
  width: number,
  height: number
): Corner[] {
  const corners: Corner[] = [];
  const threshold = 128;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      if (maskData.data[idx] < threshold) continue;

      let edgeCount = 0;
      const neighbors = [
        maskData.data[((y - 1) * width + x) * 4],
        maskData.data[((y + 1) * width + x) * 4],
        maskData.data[(y * width + (x - 1)) * 4],
        maskData.data[(y * width + (x + 1)) * 4],
      ];

      neighbors.forEach((n) => {
        if (n < threshold) edgeCount++;
      });

      if (edgeCount >= 2) {
        corners.push({ x, y });
      }
    }
  }

  return clusterCorners(corners);
}

function clusterCorners(corners: Corner[]): Corner[] {
  if (corners.length === 0) return [];

  const clustered: Corner[] = [];
  const minDistance = 20;

  corners.forEach((corner) => {
    const nearbyCluster = clustered.find(
      (c) => Math.hypot(c.x - corner.x, c.y - corner.y) < minDistance
    );

    if (nearbyCluster) {
      nearbyCluster.x = (nearbyCluster.x + corner.x) / 2;
      nearbyCluster.y = (nearbyCluster.y + corner.y) / 2;
    } else {
      clustered.push({ ...corner });
    }
  });

  return clustered;
}

interface Line {
  start: Corner;
  end: Corner;
  angle: number;
}

function detectLines(corners: Corner[]): Line[] {
  const lines: Line[] = [];

  for (let i = 0; i < corners.length; i++) {
    for (let j = i + 1; j < corners.length; j++) {
      const start = corners[i];
      const end = corners[j];
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      lines.push({ start, end, angle });
    }
  }

  return lines;
}

function findVanishingPoints(lines: Line[]): { x: number; y: number }[] {
  const vanishingPoints: { x: number; y: number }[] = [];

  if (lines.length < 2) return vanishingPoints;

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const intersection = lineIntersection(lines[i], lines[j]);

      if (intersection) {
        vanishingPoints.push(intersection);
      }
    }
  }

  return clusterVanishingPoints(vanishingPoints);
}

function lineIntersection(
  line1: Line,
  line2: Line
): { x: number; y: number } | null {
  const x1 = line1.start.x;
  const y1 = line1.start.y;
  const x2 = line1.end.x;
  const y2 = line1.end.y;

  const x3 = line2.start.x;
  const y3 = line2.start.y;
  const x4 = line2.end.x;
  const y4 = line2.end.y;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denominator) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
  };
}

function clusterVanishingPoints(
  points: { x: number; y: number }[]
): { x: number; y: number }[] {
  if (points.length === 0) return [];

  const clustered: { x: number; y: number; count: number }[] = [];
  const clusterRadius = 50;

  points.forEach((point) => {
    if (
      Math.abs(point.x) > 10000 ||
      Math.abs(point.y) > 10000 ||
      !isFinite(point.x) ||
      !isFinite(point.y)
    ) {
      return;
    }

    const nearbyCluster = clustered.find(
      (c) => Math.hypot(c.x - point.x, c.y - point.y) < clusterRadius
    );

    if (nearbyCluster) {
      nearbyCluster.x =
        (nearbyCluster.x * nearbyCluster.count + point.x) /
        (nearbyCluster.count + 1);
      nearbyCluster.y =
        (nearbyCluster.y * nearbyCluster.count + point.y) /
        (nearbyCluster.count + 1);
      nearbyCluster.count++;
    } else {
      clustered.push({ x: point.x, y: point.y, count: 1 });
    }
  });

  return clustered
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((c) => ({ x: c.x, y: c.y }));
}

function estimateFocalLength(
  vanishingPoints: { x: number; y: number }[],
  width: number,
  height: number
): number {
  if (vanishingPoints.length < 2) {
    return Math.sqrt(width * width + height * height);
  }

  const cx = width / 2;
  const cy = height / 2;

  const vp1 = vanishingPoints[0];
  const vp2 = vanishingPoints[1];

  const dx1 = vp1.x - cx;
  const dy1 = vp1.y - cy;
  const dx2 = vp2.x - cx;
  const dy2 = vp2.y - cy;

  const fSquared = -(dx1 * dx2 + dy1 * dy2);

  if (fSquared > 0) {
    return Math.sqrt(fSquared);
  }

  return Math.sqrt(width * width + height * height);
}

function computeHomographyMatrix(
  corners: Corner[],
  width: number,
  height: number
): number[][] {
  if (corners.length < 4) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }

  const sortedCorners = corners.slice(0, 4).sort((a, b) => {
    if (Math.abs(a.y - b.y) < 20) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const srcPoints = sortedCorners;
  const dstPoints = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ];

  return computeHomography(srcPoints, dstPoints);
}

function computeHomography(
  src: Corner[],
  dst: Corner[]
): number[][] {
  if (src.length !== 4 || dst.length !== 4) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }

  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}
