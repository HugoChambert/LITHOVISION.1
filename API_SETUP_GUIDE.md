# API Setup Guide

This guide provides detailed instructions for obtaining and configuring all API keys required for LITHOVISION.

## Overview

LITHOVISION requires two external APIs:

1. **OpenAI API** - For AI-powered visualization generation
2. **Replicate API** - For SAM2 segmentation (surface selection)

## 1. OpenAI API Setup

### Step 1: Create an OpenAI Account

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Click **"Sign up"** or **"Log in"** if you already have an account
3. Complete the registration process
4. Add billing information (required for API access)

### Step 2: Generate API Key

1. Log in to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API Keys**: https://platform.openai.com/api-keys
3. Click **"Create new secret key"**
4. Give it a descriptive name (e.g., "LITHOVISION Production")
5. Click **"Create secret key"**
6. **IMPORTANT:** Copy the key immediately (starts with `sk-`) - you won't be able to see it again
7. Store it securely (password manager, etc.)

### Step 3: Configure in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your LITHOVISION project
3. Navigate to **Project Settings** (gear icon in bottom left)
4. Click **Edge Functions** in the sidebar
5. Scroll to the **Secrets** section
6. Click **"Add new secret"**
7. Enter:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI key (paste the `sk-...` key)
8. Click **"Save"** or **"Create"**

### Step 4: Verify Configuration

```bash
# Check that the secret is set (from Supabase Dashboard)
# Go to Edge Functions > Secrets
# You should see: OPENAI_API_KEY (value will be hidden)
```

### Cost Information

- **Pricing Model:** Pay-per-use
- **GPT-4 Vision:** ~$0.01-0.03 per image analysis
- **DALL-E 3:** ~$0.04-0.12 per generated image (depending on size/quality)
- **Monthly Minimum:** None (pay only for what you use)
- **Recommended Budget:** $10-50/month for moderate use
- **View Pricing:** https://openai.com/pricing

### Alternative: Use Other Models

See `OPENAI_SETUP.md` for alternatives like:
- Stable Diffusion
- Anthropic Claude
- Local LLMs

---

## 2. Replicate API Setup

### Step 1: Create a Replicate Account

1. Visit [Replicate](https://replicate.com/)
2. Click **"Sign up"** or **"Sign in"** if you have an account
3. You can sign up with:
   - GitHub account (recommended)
   - Email address
4. Complete the registration process

### Step 2: Add Billing Information

1. Navigate to **Account Settings**: https://replicate.com/account
2. Click **"Billing"** in the sidebar
3. Add a payment method (credit card)
4. Note: Replicate offers free credits for new accounts

### Step 3: Generate API Token

1. Go to **API Tokens**: https://replicate.com/account/api-tokens
2. Click **"Create token"**
3. Give it a descriptive name (e.g., "LITHOVISION SAM2")
4. Click **"Create"**
5. Copy the token (starts with `r8_`)
6. Store it securely

### Step 4: Configure in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your LITHOVISION project
3. Navigate to **Project Settings** (gear icon in bottom left)
4. Click **Edge Functions** in the sidebar
5. Scroll to the **Secrets** section
6. Click **"Add new secret"**
7. Enter:
   - **Name:** `SAM_API_KEY`
   - **Value:** Your Replicate token (paste the `r8_...` token)
8. Click **"Save"** or **"Create"**

### Step 5: Verify Configuration

```bash
# Check that the secret is set (from Supabase Dashboard)
# Go to Edge Functions > Secrets
# You should see: SAM_API_KEY (value will be hidden)
```

### Cost Information

- **Pricing Model:** Pay-per-prediction
- **SAM2 Model Cost:** ~$0.00032 per prediction
- **Typical Usage:** 1-5 predictions per visualization
- **Monthly Cost Estimate:** $1-10/month for moderate use
- **Free Credits:** New accounts typically get $10 in free credits
- **View Pricing:** https://replicate.com/pricing

### SAM2 Model Details

- **Model Name:** `meta/sam-2`
- **Model URL:** https://replicate.com/meta/sam-2
- **Version:** Latest (auto-updated by API)
- **Input:** Image + points or bounding box
- **Output:** Segmentation mask (PNG)
- **Average Inference Time:** 2-5 seconds

---

## 3. Verification Checklist

After completing the setup, verify everything is configured correctly:

### In Supabase Dashboard

Navigate to: **Project Settings > Edge Functions > Secrets**

You should see these secrets:

- ✅ `OPENAI_API_KEY` (your OpenAI key)
- ✅ `SAM_API_KEY` (your Replicate key)
- ✅ `SUPABASE_URL` (auto-configured)
- ✅ `SUPABASE_ANON_KEY` (auto-configured)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-configured)
- ✅ `SUPABASE_DB_URL` (auto-configured)

### Edge Functions Deployed

Navigate to: **Edge Functions**

You should see:

- ✅ `generate-visualization` (deployed and active)
- ✅ `generate-sam-mask` (deployed and active)

### Test the Integration

1. Run the development server: `npm run dev`
2. Go to the Visualize page
3. Upload a test image
4. Try SAM2 segmentation (should work without errors)
5. Generate a visualization (should work without errors)

---

## 4. Common Issues and Solutions

### Issue: "API key not found" error

**Solution:**
1. Verify the secret name is exactly `OPENAI_API_KEY` or `SAM_API_KEY` (case-sensitive)
2. Redeploy the Edge Functions after adding secrets
3. Wait 1-2 minutes for secrets to propagate

### Issue: "Invalid API key" error

**Solution:**
1. Double-check you copied the full key (including all characters)
2. Verify the key hasn't been revoked in OpenAI/Replicate dashboard
3. Try creating a new API key

### Issue: "Billing required" error (OpenAI)

**Solution:**
1. Go to OpenAI Platform > Settings > Billing
2. Add a payment method
3. Add credits (minimum $5 recommended)

### Issue: "Insufficient credits" error (Replicate)

**Solution:**
1. Go to Replicate > Account > Billing
2. Add a payment method or purchase credits
3. Check your usage limits

### Issue: Edge Functions not working

**Solution:**
1. Verify functions are deployed: Supabase Dashboard > Edge Functions
2. Check function logs for errors: Click on function > Logs tab
3. Redeploy functions if needed

---

## 5. Security Best Practices

### Protect Your API Keys

- ❌ **NEVER** commit API keys to Git repositories
- ❌ **NEVER** expose keys in client-side code
- ❌ **NEVER** share keys in screenshots or documentation
- ✅ **ALWAYS** use environment variables or secrets management
- ✅ **ALWAYS** rotate keys if accidentally exposed
- ✅ **ALWAYS** use Supabase Edge Functions for API calls (keeps keys server-side)

### Monitor Usage

**OpenAI:**
- Set up usage limits: https://platform.openai.com/account/billing/limits
- Review usage: https://platform.openai.com/usage

**Replicate:**
- Set spending limits: https://replicate.com/account/billing
- Monitor predictions: https://replicate.com/account/predictions

### Rotate Keys Regularly

1. Create a new API key
2. Update the Supabase secret
3. Redeploy Edge Functions
4. Delete the old key
5. Recommended: Rotate every 90 days

---

## 6. Cost Optimization Tips

### For OpenAI

1. **Use appropriate models:**
   - GPT-4 Vision Mini for analysis (cheaper)
   - DALL-E 3 standard quality for most cases
2. **Optimize prompts:** Clear, concise prompts reduce token usage
3. **Cache results:** Store successful generations to avoid re-generating
4. **Set usage alerts:** Configure billing alerts in OpenAI dashboard

### For Replicate

1. **Minimize predictions:** Each segmentation = 1 prediction
2. **Use point mode efficiently:** Fewer refinements = fewer predictions
3. **Cache masks:** Store generated masks in database
4. **Batch processing:** Process multiple images together when possible

---

## 7. Support and Resources

### OpenAI Resources

- **Documentation:** https://platform.openai.com/docs
- **API Reference:** https://platform.openai.com/docs/api-reference
- **Community Forum:** https://community.openai.com/
- **Status Page:** https://status.openai.com/
- **Support:** https://help.openai.com/

### Replicate Resources

- **Documentation:** https://replicate.com/docs
- **API Reference:** https://replicate.com/docs/reference/http
- **Discord Community:** https://discord.gg/replicate
- **Status Page:** https://status.replicate.com/
- **Support:** support@replicate.com

### LITHOVISION Resources

- **Main README:** See `README.md`
- **OpenAI Setup Guide:** See `OPENAI_SETUP.md`
- **Database Schema:** See `database-setup.sql`
- **GitHub Issues:** Report problems and get help

---

## 8. Quick Reference

### Environment Variables Summary

| Variable | Location | Purpose | Format |
|----------|----------|---------|--------|
| `VITE_SUPABASE_URL` | `.env` file | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `.env` file | Supabase public key | `eyJhbGc...` |
| `OPENAI_API_KEY` | Supabase Secrets | OpenAI API access | `sk-...` |
| `SAM_API_KEY` | Supabase Secrets | Replicate API access | `r8_...` |

### API Endpoints

| Service | Purpose | Endpoint |
|---------|---------|----------|
| OpenAI | Image generation | `https://api.openai.com/v1/` |
| Replicate | SAM2 predictions | `https://api.replicate.com/v1/` |
| Supabase | Database/Storage | Your project URL |

### Cost Estimate Calculator

**Monthly Usage Example (100 visualizations):**

| Service | Unit Cost | Usage | Monthly Cost |
|---------|-----------|-------|--------------|
| OpenAI (GPT-4V) | $0.02 | 100 analyses | $2.00 |
| OpenAI (DALL-E 3) | $0.08 | 100 images | $8.00 |
| Replicate (SAM2) | $0.00032 | 300 masks | $0.10 |
| **Total** | | | **~$10.10/month** |

---

## Next Steps

After completing this setup:

1. ✅ Test the visualization workflow end-to-end
2. ✅ Verify SAM2 segmentation works in both modes
3. ✅ Set up usage monitoring and alerts
4. ✅ Document your API key rotation schedule
5. ✅ Configure backup API keys for redundancy
6. ✅ Review cost optimization settings

For detailed usage instructions, see the main README.md file.
