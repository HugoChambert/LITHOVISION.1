import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SAMRequest {
  imageUrl: string;
  positivePoints: { x: number; y: number }[];
  negativePoints: { x: number; y: number }[];
  imageWidth: number;
  imageHeight: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      imageUrl,
      positivePoints,
      negativePoints,
      imageWidth,
      imageHeight,
    }: SAMRequest = await req.json();

    console.log("SAM mask generation request:", {
      imageUrl,
      positivePoints: positivePoints.length,
      negativePoints: negativePoints.length,
      imageWidth,
      imageHeight,
    });

    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBase64 = await blobToBase64(imageBlob);

    const samApiKey = Deno.env.get("SAM_API_KEY");

    if (!samApiKey) {
      console.error("SAM_API_KEY not configured");

      const simpleMask = generateSimpleMask(
        positivePoints,
        imageWidth,
        imageHeight
      );

      return new Response(
        JSON.stringify({ maskUrl: simpleMask }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const samResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${samApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "3a5f7bf1eee96c683a2e65364b8ddfeb4e0cca6be2f4f778f4bb0c8e0d53c50f",
        input: {
          image: `data:image/jpeg;base64,${imageBase64}`,
          point_coords: [
            ...positivePoints.map(p => [p.x, p.y]),
            ...negativePoints.map(p => [p.x, p.y]),
          ],
          point_labels: [
            ...positivePoints.map(() => 1),
            ...negativePoints.map(() => 0),
          ],
          multimask_output: false,
        },
      }),
    });

    if (!samResponse.ok) {
      throw new Error(`SAM API error: ${samResponse.statusText}`);
    }

    const prediction = await samResponse.json();
    let predictionData = prediction;

    while (predictionData.status === "starting" || predictionData.status === "processing") {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionData.id}`,
        {
          headers: {
            "Authorization": `Token ${samApiKey}`,
          },
        }
      );

      predictionData = await statusResponse.json();
    }

    if (predictionData.status === "succeeded" && predictionData.output) {
      return new Response(
        JSON.stringify({ maskUrl: predictionData.output }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    throw new Error("SAM mask generation failed");

  } catch (error) {
    console.error("Error in SAM mask generation:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateSimpleMask(
  points: { x: number; y: number }[],
  width: number,
  height: number
): string {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context failed');
  }

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'white';

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, 50, 0, 2 * Math.PI);
    ctx.fill();
  } else if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.closePath();
    ctx.fill();
  }

  return canvas.convertToBlob({ type: 'image/png' }).then(blob => {
    return blobToBase64(blob);
  }).then(base64 => `data:image/png;base64,${base64}`);
}
