# LITHOVISION

A professional stone slab visualization platform for countertops and interior surfaces. LITHOVISION allows designers, fabricators, and showrooms to realistically visualize how different stone materials (marble, granite, quartzite) will look in actual kitchen and interior spaces.

## Features

- **Slab Gallery**: Browse available stone slabs filtered by type
- **AI Visualization**: Upload kitchen photos and see how different slabs look applied to countertops
- **Before/After Comparison**: Interactive slider to compare original vs. visualized results
- **Project History**: Save and revisit all visualizations
- **High-Quality Results**: Photorealistic renders suitable for client presentations
- **Hidden Admin Access**: Inventory management accessible via **Ctrl + Shift + A** keyboard shortcut
- **Material Organization**: Categorize slabs by type (marble, granite, quartzite)
- **Open Access**: No sign-in required - anyone can use all features immediately

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Storage)
- **Edge Functions**: Deno-based serverless functions
- **AI Integration**: OpenAI GPT-4 Vision / Stable Diffusion
- **Styling**: Custom CSS with modern design system
- **Access**: Open to all - no authentication required

## Project Structure

```
lithovision/
├── src/
│   ├── components/
│   │   ├── auth/              # Authentication forms
│   │   ├── layout/            # Header and layout components
│   │   └── visualization/     # Before/after comparison slider
│   ├── contexts/              # React contexts (Auth)
│   ├── lib/                   # Supabase client setup
│   ├── pages/                 # Main application pages
│   │   ├── AdminPage.tsx      # Admin dashboard
│   │   ├── VisualizePage.tsx  # Main visualization interface
│   │   └── ProjectsPage.tsx   # Project history
│   ├── styles/                # Global styles
│   ├── types/                 # TypeScript type definitions
│   ├── App.tsx                # Main app component
│   └── main.tsx               # Entry point
├── supabase/
│   └── functions/
│       └── generate-visualization/  # AI visualization function
├── database-setup.sql         # Complete database schema
├── API_SETUP_GUIDE.md        # Comprehensive API configuration guide
├── OPENAI_SETUP.md           # AI integration guide
└── package.json

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account
- **Required API Keys**:
  - OpenAI API key (for visualization generation)
  - Replicate API key (for SAM2 segmentation)

### 2. Clone and Install

```bash
git clone <your-repo>
cd lithovision
npm install
```

### 3. Environment Variables

The `.env` file is already configured with Supabase credentials:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 4. Database Setup

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database-setup.sql`
4. Run the SQL to create all tables, policies, and triggers

### 5. Storage Setup

The database setup automatically creates two storage buckets:
- `slab-images`: Public bucket for slab inventory photos
- `project-images`: Public bucket for user uploads and results

### 6. Enable Public Access

To enable open access without authentication:

1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste the contents of `database-open-access.sql`
3. Run the SQL to update Row Level Security policies

This migration removes authentication requirements and makes all features publicly accessible.

### 7. API Keys Configuration

LITHOVISION requires two API keys for full functionality.

**📖 For detailed step-by-step instructions, see [API_SETUP_GUIDE.md](./API_SETUP_GUIDE.md)**

#### Quick Summary:

**7.1 OpenAI API Key** (Required for Visualization)
1. Get key from: https://platform.openai.com/api-keys
2. Add to Supabase: **Project Settings > Edge Functions > Secrets**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-...` (your key)

**7.2 Replicate API Key** (Required for SAM2 Segmentation)
1. Get token from: https://replicate.com/account/api-tokens
2. Add to Supabase: **Project Settings > Edge Functions > Secrets**
   - Name: `SAM_API_KEY`
   - Value: `r8_...` (your token)

**7.3 Verify Configuration**

Check Supabase Dashboard > Edge Functions > Secrets shows:
- ✅ `OPENAI_API_KEY`
- ✅ `SAM_API_KEY`
- ✅ `SUPABASE_URL` (auto-configured)
- ✅ `SUPABASE_ANON_KEY` (auto-configured)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-configured)
- ✅ `SUPABASE_DB_URL` (auto-configured)

### 8. Deploy Edge Functions

The application requires two Edge Functions to be deployed:

#### 8.1 Deploy generate-visualization

This function handles AI-powered visualization generation using OpenAI.

**If using Supabase CLI:**
```bash
supabase functions deploy generate-visualization
```

**Or manually:** Upload via Supabase Dashboard > Edge Functions

#### 8.2 Deploy generate-sam-mask

This function handles SAM2 segmentation for precise surface selection.

**If using Supabase CLI:**
```bash
supabase functions deploy generate-sam-mask
```

**Or manually:** Upload via Supabase Dashboard > Edge Functions

### 9. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 10. Build for Production

```bash
npm run build
```

## Usage Guide

### Admin Workflow

1. **Access Admin page** by pressing **Ctrl + Shift + A** (hidden from navigation)
2. **Add slabs**:
   - Click "Add New Slab"
   - Enter name, type, and description
   - Upload high-quality slab image
   - Save
3. **Manage inventory**:
   - Edit slab details
   - Activate/deactivate slabs
   - Delete slabs if needed

### Visualization Workflow

1. **Go to Visualize** page (default landing page)
2. **Select a slab** from the gallery
3. **Upload a reference photo** of your kitchen/space
4. **Enter a project name**
5. **Click "Generate Visualization"**
6. **View the result** with interactive before/after slider
7. Project is automatically saved

### Viewing Project History

1. Go to **Projects** page
2. Browse all visualizations (from all users)
3. Click **View** to see the before/after comparison
4. Delete projects you no longer need

## AI Prompt Templates

The app uses optimized prompts for each stone type:

### Marble
- Natural veining patterns
- Polished surface with subtle reflections
- High-end luxury appearance
- Realistic scale and lighting

### Granite
- Natural speckled pattern
- Polished surface with depth
- Realistic lighting and reflections
- Professional finish

### Quartzite
- Crystalline pattern and veining
- Polished surface with shimmer
- Natural stone characteristics
- Premium appearance

## Access Model

- **Open Access**: No authentication required - anyone can use all features
- **Public Data**: All projects and images are publicly visible
- **Shared Inventory**: Single stone slab library accessible to all
- **Public Admin**: Inventory management available to all visitors

Note: This is ideal for demos, trade shows, kiosks, or internal deployments behind a firewall. For production use with multiple customers, consider adding authentication at the hosting level (HTTP Basic Auth, IP whitelisting, etc.).

## API Integration Summary

LITHOVISION integrates with two external AI services:

### OpenAI (Visualization Generation)
- **Purpose:** Generates photorealistic countertop visualizations
- **Model Used:** GPT-4 Vision or DALL-E 3
- **API Documentation:** https://platform.openai.com/docs
- **Get API Key:** https://platform.openai.com/api-keys
- **Configure In:** Supabase Dashboard > Edge Functions > Secrets > `OPENAI_API_KEY`
- **Alternative Options:** See `OPENAI_SETUP.md` for Stable Diffusion and other alternatives

### Replicate (SAM2 Segmentation)
- **Purpose:** AI-powered surface segmentation for precise countertop selection
- **Model Used:** SAM2 (Segment Anything Model 2)
- **Model URL:** https://replicate.com/meta/sam-2
- **API Documentation:** https://replicate.com/docs
- **Get API Key:** https://replicate.com/account/api-tokens
- **Configure In:** Supabase Dashboard > Edge Functions > Secrets > `SAM_API_KEY`

### Quick Setup Checklist

- [ ] Create OpenAI account and get API key
- [ ] Create Replicate account and get API token
- [ ] Add `OPENAI_API_KEY` to Supabase Edge Functions secrets
- [ ] Add `SAM_API_KEY` to Supabase Edge Functions secrets
- [ ] Deploy `generate-visualization` Edge Function
- [ ] Deploy `generate-sam-mask` Edge Function
- [ ] Test visualization workflow with a sample image
- [ ] Test SAM2 segmentation with point and box modes

## Performance Optimization

- Image uploads optimized with preview generation
- Lazy loading for project galleries
- Efficient database queries with indexes
- CDN-ready storage buckets

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use for commercial projects

## Support

For issues or questions:
- Check `OPENAI_SETUP.md` for AI integration
- Review `database-setup.sql` for schema details
- Contact support for assistance

## SAM2 Integration

LITHOVISION uses SAM2 (Segment Anything Model 2) for precise countertop segmentation:

### Features
- **Point Mode**: Click to add positive (include) or negative (exclude) points
- **Box Mode**: Click and drag to draw a bounding box around surfaces
- **Improved Accuracy**: Better edge detection and surface recognition
- **Complex Object Handling**: Handles intricate countertop shapes and angles
- **Real-time Feedback**: Visual preview of points and boxes before generating masks
- **Undo/Clear Controls**: Easy management of selection points and boxes

### How to Use SAM2

1. **On the Visualize page**, after uploading a reference image
2. **Choose a segmentation mode**:
   - **Point Mode**: Click on the countertop surface to include areas (green) or exclude unwanted areas (red)
   - **Box Mode**: Click and drag to draw a bounding box around the entire countertop
3. **Refine your selection** using Undo Last or Clear All buttons
4. **Generate the mask** to create a precise selection
5. The mask is then used for applying the stone slab texture

### API Configuration
SAM2 requires a Replicate API key configured as `SAM_API_KEY` in Supabase Edge Functions (see Setup Instructions above).

## Roadmap

- [x] SAM2 integration for advanced segmentation
- [ ] Stable Diffusion integration
- [ ] Multiple surface support (islands, backsplashes)
- [ ] Lighting adjustment controls
- [ ] Batch processing
- [ ] Mobile app version
- [ ] AR preview capability
- [ ] Integration with fabrication systems

---

Built with modern web technologies for professional stone visualization.
