import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  projectId: string;
  compositedImageUrl: string;
  prompt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { projectId, compositedImageUrl, prompt }: RequestBody = await req.json();

    if (!projectId || !compositedImageUrl || !prompt) {
      throw new Error("Missing required fields");
    }

    const replicateApiKey = Deno.env.get("REPLICATE_API_KEY");
    if (!replicateApiKey) {
      throw new Error("Replicate API key not configured");
    }

    console.log("Starting lighting refinement");
    console.log("Composited image:", compositedImageUrl);
    console.log("Prompt:", prompt);

    // Use img2img with VERY LOW strength to only adjust lighting/shadows
    // The composited image already has the exact slab texture
    const refinementPrompt = `${prompt}, photorealistic interior photography, natural lighting, realistic shadows and reflections on stone countertop surface, ambient occlusion, depth, professional architectural photography, high resolution`;
    
    const negativePrompt = "change texture, change material, different colors, different patterns, blurry, low quality, distorted, cartoon, painting, illustration, watermark, text, deformed, overexposed, underexposed, flat lighting";

    console.log("Refinement prompt:", refinementPrompt);

    // Use SDXL img2img with very low strength
    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          image: compositedImageUrl,
          prompt: refinementPrompt,
          negative_prompt: negativePrompt,
          strength: 0.15,              // VERY LOW - only tweaks lighting
          guidance_scale: 7,
          num_inference_steps: 30,
          scheduler: "K_EULER",
          seed: 42,
        },
      }),
    });

    if (!predictionResponse.ok) {
      const errorData = await predictionResponse.text();
      console.error("Replicate API error:", errorData);
      throw new Error(`Replicate API error: ${predictionResponse.status} - ${errorData}`);
    }

    const prediction = await predictionResponse.json();
    console.log("Prediction started:", prediction.id);

    // Poll for result
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 120;

    while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { "Authorization": `Token ${replicateApiKey}` },
      });

      if (!pollResponse.ok) {
        throw new Error(`Failed to poll: ${pollResponse.status}`);
      }

      result = await pollResponse.json();
      attempts++;
      if (attempts % 15 === 0) {
        console.log(`Attempt ${attempts}: ${result.status}`);
      }
    }

    if (result.status === "failed") {
      throw new Error(`Generation failed: ${result.error}`);
    }

    if (result.status !== "succeeded") {
      throw new Error("Generation timed out");
    }

    const resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    if (!resultUrl) {
      throw new Error("No output image generated");
    }

    console.log("Success:", resultUrl);

    return new Response(
      JSON.stringify({ success: true, projectId, resultUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

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
