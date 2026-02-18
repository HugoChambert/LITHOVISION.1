import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DetectRequest {
  action: 'detect';
  imageUrl: string;
}

interface ApplyRequest {
  action: 'apply';
  projectId: string;
  imageUrl: string;
  slabImageUrl: string;
  maskUrl: string;
  slabName: string;
  slabType: string;
}

type RequestBody = DetectRequest | ApplyRequest;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const replicateApiKey = Deno.env.get("REPLICATE_API_KEY");
    
    if (!replicateApiKey) {
      throw new Error("Replicate API key not configured");
    }

    if (body.action === 'detect') {
      return await detectCountertop(body.imageUrl, replicateApiKey);
    } else {
      return await applyTexture(body, replicateApiKey);
    }

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An error occurred",
        details: error instanceof Error ? error.stack : undefined 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Step 1: Auto-detect countertop using SAM
async function detectCountertop(imageUrl: string, apiKey: string) {
  console.log("Starting countertop detection with SAM");

  // Use Segment Anything Model (SAM) to detect countertop surfaces
  const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "18cf84e062ec28b5b1b0a78f2a5e1d4e738acd8a9c7479c38e01237d5a21af63",
      input: {
        image: imageUrl,
        prompt: "countertop, kitchen counter, counter surface",
        box_threshold: 0.3,
        text_threshold: 0.25,
      },
    }),
  });

  if (!predictionResponse.ok) {
    const error = await predictionResponse.text();
    console.error("SAM error:", error);
    throw new Error(`Detection failed: ${predictionResponse.status}`);
  }

  const prediction = await predictionResponse.json();
  console.log("Detection started:", prediction.id);

  // Poll for result
  let result = await pollPrediction(prediction.id, apiKey, 60);

  if (!result.output) {
    throw new Error("No mask generated");
  }

  const maskUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  console.log("Detection complete:", maskUrl);

  return new Response(
    JSON.stringify({ success: true, maskUrl }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Step 2: Apply exact slab texture with ControlNet Tile
async function applyTexture(body: ApplyRequest, apiKey: string) {
  const { imageUrl, slabImageUrl, maskUrl, slabName, slabType } = body;

  console.log("Applying texture with ControlNet Tile");
  console.log("Slab:", slabName, slabType);

  // Use ControlNet Tile to apply the exact slab texture with realistic lighting
  const prompt = `Replace the masked horizontal surface at ${maskurl} (kitchen countertop, bathroom vanity, island, or similar flat countertop surface) with ${slabName} ${slabType}.

Use authentic ${slabType} stone with natural color tones consistent with real-world slabs from this material family.
Surface finish must be polished.

The material must be applied correctly to a horizontal countertop surface with proper depth, edge realism, and accurate slab scale.

Ensure:
- Natural stone veining and pattern flow appropriate for ${slabType}, flowing realistically across the full surface
- Correct 1:1 material scale suitable for kitchen and bathroom countertops
- High-resolution texture detail with subtle natural micro-variation
- Accurate polished reflections based on the existing scene lighting
- Proper horizontal perspective and depth alignment
- Realistic slab thickness at exposed edges
- Seamless transitions where the surface meets backsplash, sinks, faucets, or cabinetry
- Authentic shadows from objects naturally falling across the countertop

Maintain the existing room, cabinetry, walls, lighting, fixtures, and objects exactly as they are.
Do not alter anything outside the masked area. 

Render in full color, photorealistic quality, high resolution.
`;
  
  const negativePrompt = "different texture, wrong colors, wrong patterns, artificial, fake, plastic, laminate, blurry, low quality, distorted, cartoon, painting, illustration, watermark, text, deformed, bad lighting, flat, unrealistic";

  console.log("Prompt:", prompt);

  // Use SDXL ControlNet with tile control
  const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117",
      input: {
        image: imageUrl,
        prompt: prompt,
        negative_prompt: negativePrompt,
        control_image: slabImageUrl,  // Use slab as tile reference
        mask: maskUrl,
        controlnet_conditioning_scale: 0.8,  // Strong influence from slab texture
        num_inference_steps: 40,
        guidance_scale: 8,
        scheduler: "K_EULER",
        seed: 42,
      },
    }),
  });

  if (!predictionResponse.ok) {
    const error = await predictionResponse.text();
    console.error("ControlNet error:", error);
    throw new Error(`Texture application failed: ${predictionResponse.status}`);
  }

  const prediction = await predictionResponse.json();
  console.log("Application started:", prediction.id);

  // Poll for result
  let result = await pollPrediction(prediction.id, apiKey, 120);

  const resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  
  if (!resultUrl) {
    throw new Error("No output generated");
  }

  console.log("Application complete:", resultUrl);

  return new Response(
    JSON.stringify({ success: true, resultUrl }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Helper: Poll prediction until complete
async function pollPrediction(id: string, apiKey: string, maxAttempts: number) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { "Authorization": `Token ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`);
    }

    const result = await response.json();
    attempts++;

    if (attempts % 10 === 0) {
      console.log(`Attempt ${attempts}: ${result.status}`);
    }

    if (result.status === "succeeded") {
      return result;
    }

    if (result.status === "failed") {
      throw new Error(`Prediction failed: ${result.error}`);
    }
  }

  throw new Error("Prediction timed out");
}
