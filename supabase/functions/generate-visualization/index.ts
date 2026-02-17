import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  projectId: string;
  referenceImageUrl: string;
  slabImageUrl: string;
  maskDataUrl: string;
  prompt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { projectId, referenceImageUrl, slabImageUrl, maskDataUrl, prompt }: RequestBody = await req.json();

    if (!projectId || !referenceImageUrl || !prompt) {
      throw new Error("Missing required fields");
    }

    const replicateApiKey = Deno.env.get("REPLICATE_API_KEY");
    if (!replicateApiKey) {
      throw new Error("Replicate API key not configured");
    }

    // Extract material name from prompt for a clean inpainting prompt
    const materialMatch = prompt.match(/Apply (.+?) stone/);
    const materialName = materialMatch ? materialMatch[1] : "stone";

    const inpaintPrompt = `${materialName} stone countertop surface, photorealistic, high resolution, professional interior photography, seamless material, natural stone texture`;
    const negativePrompt = "blurry, low quality, distorted, cartoon, painting, watermark, text, ugly, deformed, bad lighting";

    console.log("Starting inpainting with material:", materialName);
    console.log("Has mask:", !!maskDataUrl);

    // Use stability-ai inpainting model - only changes the masked (white) area
    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
        input: {
          image: referenceImageUrl,
          mask: maskDataUrl,          // White = replace, Black = keep
          prompt: inpaintPrompt,
          negative_prompt: negativePrompt,
          num_inference_steps: 50,
          guidance_scale: 8,
          scheduler: "K_EULER_ANCESTRAL",
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
      console.log(`Attempt ${attempts}: ${result.status}`);
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
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
