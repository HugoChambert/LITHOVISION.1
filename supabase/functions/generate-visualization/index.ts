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
  prompt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { projectId, referenceImageUrl, slabImageUrl, prompt }: RequestBody = await req.json();

    if (!projectId || !referenceImageUrl || !slabImageUrl || !prompt) {
      throw new Error("Missing required fields");
    }

    const replicateApiKey = Deno.env.get("REPLICATE_API_KEY");
    if (!replicateApiKey) {
      throw new Error("Replicate API key not configured");
    }

    // Start the prediction using Stable Diffusion img2img
    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Stable Diffusion XL img2img model
        version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
        input: {
          image: referenceImageUrl,
          prompt: prompt,
          negative_prompt: "blurry, low quality, distorted, unrealistic, cartoon, painting, drawing, bad proportions, wrong perspective",
          strength: 0.6,        // How much to change the image (0=no change, 1=completely new)
          guidance_scale: 7.5,  // How closely to follow the prompt
          num_inference_steps: 30,
          scheduler: "K_EULER",
        },
      }),
    });

    if (!predictionResponse.ok) {
      const errorData = await predictionResponse.text();
      console.error("Replicate API error:", errorData);
      throw new Error(`Replicate API error: ${predictionResponse.status}`);
    }

    const prediction = await predictionResponse.json();
    console.log("Prediction started:", prediction.id);

    // Poll for the result (Replicate is async)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60; // Wait up to 60 seconds

    while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Token ${replicateApiKey}`,
        },
      });

      if (!pollResponse.ok) {
        throw new Error(`Failed to poll prediction: ${pollResponse.status}`);
      }

      result = await pollResponse.json();
      attempts++;
      console.log(`Attempt ${attempts}: status = ${result.status}`);
    }

    if (result.status === "failed") {
      throw new Error(`Image generation failed: ${result.error}`);
    }

    if (result.status !== "succeeded") {
      throw new Error("Image generation timed out");
    }

    // Get the output image URL
    const resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    if (!resultUrl) {
      throw new Error("No output image generated");
    }

    console.log("Generation succeeded:", resultUrl);

    return new Response(
      JSON.stringify({
        success: true,
        projectId: projectId,
        resultUrl: resultUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error in generate-visualization:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred",
        details: error instanceof Error ? error.stack : undefined,
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
