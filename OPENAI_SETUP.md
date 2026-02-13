# OpenAI API Integration Guide

This document explains how to integrate OpenAI's image generation capabilities into LithoVision.

## Current Implementation

The Edge Function at `supabase/functions/generate-visualization/index.ts` is set up to:
1. Accept reference images (kitchen photos) and slab images
2. Process and encode images to base64
3. Send requests to OpenAI's API
4. Return generated visualization results

## OpenAI API Setup

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### Step 2: Add API Key to Supabase

1. Go to your Supabase Dashboard
2. Navigate to Project Settings > Edge Functions
3. Add a new secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

### Step 3: Deploy the Edge Function

Deploy the visualization function to Supabase:

```bash
supabase functions deploy generate-visualization
```

## Important Notes About Image Generation

### Current Limitation

As of now, OpenAI's GPT-4 Vision API can **analyze and describe images** but cannot **generate new images** directly. The current implementation uses GPT-4o with vision capabilities.

### Options for Actual Image Generation

To achieve realistic stone slab visualization, you have several options:

#### Option 1: DALL-E 3 (OpenAI)

Use DALL-E 3 for image generation, but note it works best with text-to-image, not image-to-image transformations.

```typescript
const response = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${openaiApiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "dall-e-3",
    prompt: prompt,
    size: "1024x1024",
    quality: "hd",
    n: 1,
  }),
});
```

**Pros:**
- High quality images
- Easy to use
- Integrated with OpenAI

**Cons:**
- No direct image-to-image support
- Limited control over precise material application
- More expensive

#### Option 2: Stable Diffusion (Recommended)

Use Stable Diffusion via Replicate, Stability AI, or self-hosted:

```typescript
// Example using Replicate API
const response = await fetch("https://api.replicate.com/v1/predictions", {
  method: "POST",
  headers: {
    "Authorization": `Token ${replicateApiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    version: "stability-ai/sdxl",
    input: {
      image: referenceImageUrl,
      prompt: prompt,
      strength: 0.8,
      guidance_scale: 7.5,
    },
  }),
});
```

**Pros:**
- True image-to-image transformation
- Better control over material application
- More cost-effective
- Can use ControlNet for precise control

**Cons:**
- Requires separate API service
- May need fine-tuning for best results

#### Option 3: Midjourney API

Use Midjourney via their API (requires subscription):

**Pros:**
- Highest quality photorealistic results
- Excellent with architectural visualization

**Cons:**
- More expensive
- API access may be limited
- Slower processing

#### Option 4: Custom Model

Fine-tune a Stable Diffusion model specifically for stone materials:

**Pros:**
- Best quality for your specific use case
- Full control
- Can train on your slab inventory

**Cons:**
- Requires ML expertise
- Initial setup time
- Hosting costs

## Example Prompts by Material Type

The application includes optimized prompts for each stone type:

### Marble
```
Apply [Slab Name] marble stone to the countertop surfaces in this kitchen.
Photorealistic marble stone with natural veining, polished surface with subtle
reflections, high-end luxury appearance, correct scale and proportion, realistic
lighting. Preserve the original scene geometry, lighting, and all other elements.
```

### Granite
```
Apply [Slab Name] granite stone to the countertop surfaces in this kitchen.
Photorealistic granite stone with natural speckled pattern, polished surface
with depth, high-end luxury appearance, correct scale and proportion, realistic
lighting and reflections. Preserve the original scene geometry.
```

### Quartzite
```
Apply [Slab Name] quartzite stone to the countertop surfaces in this kitchen.
Photorealistic quartzite stone with natural crystalline pattern and veining,
polished surface with subtle shimmer, high-end luxury appearance, correct
scale and proportion, realistic lighting.
```

## Testing the Integration

1. Sign up for an account in the app
2. Make your account an admin (run SQL: `UPDATE profiles SET is_admin = true WHERE email = 'your@email.com'`)
3. Upload some slab images via the Admin panel
4. Go to Visualize and upload a kitchen photo
5. Select a slab and generate visualization

## Cost Considerations

- **GPT-4 Vision**: ~$0.01 per image analyzed
- **DALL-E 3**: ~$0.04 per image (standard), $0.08 (HD)
- **Stable Diffusion (Replicate)**: ~$0.002 per second of compute
- **Midjourney**: Subscription-based (~$30-60/month)

## Recommended Solution

For production use with LithoVision, we recommend:

1. **Stable Diffusion XL with ControlNet** via Replicate
2. Use the kitchen photo as a ControlNet guide
3. Apply the slab texture as an image prompt
4. Use detailed prompts for material characteristics

This provides the best balance of:
- Cost effectiveness
- Quality control
- Processing speed
- Realistic results

## Support

For more information:
- OpenAI Documentation: https://platform.openai.com/docs
- Stable Diffusion: https://stability.ai/
- Replicate: https://replicate.com/
