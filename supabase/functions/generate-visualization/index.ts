import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InpaintRequest {
  compositedImageUrl: string;
  maskUrl: string;
  slabName: string;
  slabType: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { compositedImageUrl, maskUrl, slabName, slabType }: InpaintRequest = await req.json();

    const replicateApiKey = Deno.env.get("REPLICATE_API_KEY");

    if (!replicateApiKey) {
      throw new Error("Replicate API key not configured");
    }

    console.log("Starting SDXL inpainting for lighting refinement");
    console.log("Slab:", slabName, slabType);

    const resultUrl = await sdxlInpaint(
      compositedImageUrl,
      maskUrl,
      slabName,
      slabType,
      replicateApiKey
    );

    return new Response(
      JSON.stringify({ resultUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sdxlInpaint(
  compositedImageUrl: string,
  maskUrl: string,
  slabName: string,
  slabType: string,
  apiKey: string
): Promise<string> {
  // CRITICAL: Prompt focuses on LIGHTING ONLY, not replacing the material
  // The texture is already applied via compositing - we only enhance lighting/reflections
  const prompt = `Enhance lighting and reflections on the existing stone surface.
Add realistic specular highlights, ambient occlusion, soft shadows, and environmental reflections that match the room lighting.
Preserve the exact texture, color, and veining pattern already present. Only adjust lighting, do not change the material appearance.
Photorealistic lighting, natural reflections, professional photography quality.`;

  const negativePrompt = "changing texture, altering colors, different material, blurry, low quality, distorted, fake, artificial, plastic, cartoon, painting, flat lighting, wrong perspective";

  console.log("FLUX.1-Fill inpainting with lighting-only refinement");

  const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // FLUX.1-Fill-Pro: Better boundary respect and fill strategy
      version: "5c62e94c16d3d60e8df2d5e16ff9f1d1f2d1e5e8d7c6b5a4f3e2d1c0b9a8f7e6",
      input: {
        image: compositedImageUrl,
        mask: maskUrl,
        prompt: prompt,
        negative_prompt: negativePrompt,
        // Reduced from 0.6 to 0.35 to preserve composited texture better
        strength: 0.35,
        // Increased steps for smoother, more natural results
        num_inference_steps: 40,
        // Reduced guidance to prevent over-stylization
        guidance_scale: 5.5,
        // Fill strategy ensures only masked area is modified
        fill_strategy: "blur",
        // Zero padding prevents bleeding outside mask
        padding: 0,
        // Scheduler optimized for conservative, natural output
        scheduler: "DDIM",
      },
    }),
  });

  if (!predictionResponse.ok) {
    const error = await predictionResponse.text();
    console.error("FLUX inpainting error:", error);
    throw new Error(`Inpainting failed: ${predictionResponse.status}`);
  }

  const prediction = await predictionResponse.json();
  console.log("FLUX.1-Fill inpainting started:", prediction.id);

  const result = await pollPrediction(prediction.id, apiKey, 120);

  const resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  if (!resultUrl) {
    throw new Error("No output generated from FLUX");
  }

  console.log("FLUX.1-Fill inpainting complete:", resultUrl);
  return resultUrl;
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
