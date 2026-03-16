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
  const prompt = `Photorealistic ${slabType} stone countertop surface with ${slabName} pattern.
Natural stone texture with authentic veining, polished finish, realistic lighting and reflections that match the room environment.
Maintain proper perspective, depth, and shadows. High resolution, professional photography quality.`;

  const negativePrompt = "blurry, low quality, distorted, fake, artificial, plastic, cartoon, painting, unrealistic, wrong colors, flat lighting";

  console.log("SDXL Inpainting prompt:", prompt);

  const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      input: {
        image: compositedImageUrl,
        mask: maskUrl,
        prompt: prompt,
        negative_prompt: negativePrompt,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        strength: 0.6,
        scheduler: "DPMSolverMultistep",
      },
    }),
  });

  if (!predictionResponse.ok) {
    const error = await predictionResponse.text();
    console.error("SDXL error:", error);
    throw new Error(`Inpainting failed: ${predictionResponse.status}`);
  }

  const prediction = await predictionResponse.json();
  console.log("SDXL inpainting started:", prediction.id);

  const result = await pollPrediction(prediction.id, apiKey, 120);

  const resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  if (!resultUrl) {
    throw new Error("No output generated from SDXL");
  }

  console.log("SDXL inpainting complete:", resultUrl);
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
