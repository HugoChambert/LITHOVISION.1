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

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const referenceImageResponse = await fetch(referenceImageUrl);
    const referenceImageBlob = await referenceImageResponse.blob();
    const referenceImageBase64 = await blobToBase64(referenceImageBlob);

    const slabImageResponse = await fetch(slabImageUrl);
    const slabImageBlob = await slabImageResponse.blob();
    const slabImageBase64 = await blobToBase64(slabImageBlob);

    const enhancedPrompt = `${prompt}

IMPORTANT REQUIREMENTS:
- Apply the stone material ONLY to horizontal countertop surfaces
- Maintain all original lighting, shadows, and reflections
- Preserve exact geometry and perspective of the original scene
- Match the stone's scale realistically (natural veining should be appropriately sized)
- Ensure photorealistic quality suitable for client presentation
- Keep all other elements (cabinets, walls, appliances, floors) unchanged
- The stone should have natural depth and dimension

Reference the provided slab image for accurate color, pattern, and veining characteristics.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: enhancedPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${referenceImageBase64}`,
                },
              },
              {
                type: "text",
                text: "Here is the stone slab material to apply to the countertops:",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${slabImageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();

    console.log("OpenAI Response:", JSON.stringify(openaiData, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        projectId: projectId,
        message: "Note: This is a demonstration response. To enable actual image generation, you need to:",
        instructions: [
          "1. Add your OpenAI API key as OPENAI_API_KEY environment variable",
          "2. The current GPT-4 Vision API analyzes images but doesn't generate new images",
          "3. For image generation, you would need to use DALL-E 3 or a specialized image-to-image API",
          "4. Alternative: Use Stable Diffusion API, Midjourney API, or other image generation services"
        ],
        resultUrl: referenceImageUrl,
        openaiResponse: openaiData.choices[0].message.content
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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
