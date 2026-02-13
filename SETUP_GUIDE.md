# LithoVision Quick Setup Guide

## What Was Built

LithoVision is a professional stone slab visualization platform with:

### Features
- **Admin Dashboard**: Manage stone slab inventory (marble, granite, quartzite)
- **Visualization Engine**: Upload kitchen photos and apply stone materials
- **Before/After Slider**: Interactive comparison of original vs. visualized results
- **Project History**: Save and revisit all visualizations
- **User Authentication**: Secure login with role-based access
- **Cloud Storage**: Automatic image hosting and management

### Technology Stack
- React 18 + TypeScript
- Vite for build tooling
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- OpenAI GPT-4 Vision API integration (ready to configure)
- Modern, responsive CSS design

## Quick Start (5 Minutes)

### 1. Database Setup
Copy and run `database-setup.sql` in your Supabase SQL Editor. This creates:
- User profiles with admin roles
- Slabs inventory table
- Projects/visualization history table
- Storage buckets for images
- Row Level Security policies

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Already configured in `.env` with your Supabase credentials.

### 4. Create Admin Account
```bash
# Create user in Supabase Dashboard:
# Go to Authentication > Users > Add User
# Create an account with email and password

# Then run this SQL in Supabase:
UPDATE profiles SET is_admin = true WHERE email = 'your@email.com';

# Start the app
npm run dev

# Visit http://localhost:5173 and sign in
```

### 5. Add Stone Slabs
- Log in as admin
- Go to Admin page
- Click "Add New Slab"
- Upload images of marble, granite, or quartzite slabs
- Add names and descriptions

### 6. Test Visualization
- Go to Visualize page
- Select a slab from gallery
- Upload a kitchen photo
- Enter project name
- Click "Generate Visualization"

## OpenAI Integration (Optional)

To enable actual AI image generation:

### Option 1: OpenAI GPT-4 Vision
1. Get API key from https://platform.openai.com/
2. In Supabase Dashboard > Edge Functions
3. Add secret: `OPENAI_API_KEY` = `sk-your-key`
4. Deploy function: `supabase functions deploy generate-visualization`

### Option 2: Stable Diffusion (Recommended)
For better image-to-image results, see `OPENAI_SETUP.md` for:
- Replicate API setup
- Stability AI integration
- Custom model options
- Cost comparisons

## File Structure

```
lithovision/
├── src/
│   ├── components/
│   │   ├── auth/AuthForm.tsx          # Login form
│   │   ├── layout/Header.tsx          # Navigation bar
│   │   └── visualization/
│   │       └── ComparisonSlider.tsx   # Before/after slider
│   ├── contexts/AuthContext.tsx       # Authentication state
│   ├── lib/supabase.ts                # Supabase client
│   ├── pages/
│   │   ├── AdminPage.tsx              # Inventory management
│   │   ├── VisualizePage.tsx          # Main visualization UI
│   │   └── ProjectsPage.tsx           # Project history
│   ├── types/                         # TypeScript definitions
│   └── App.tsx                        # Main app + routing
├── supabase/functions/
│   └── generate-visualization/        # AI Edge Function
├── database-setup.sql                 # Complete DB schema
├── OPENAI_SETUP.md                   # AI integration guide
└── README.md                          # Full documentation
```

## Key Features Explained

### Admin Dashboard
- Upload high-quality slab images
- Organize by material type (marble, granite, quartzite)
- Activate/deactivate slabs from user view
- Edit names, descriptions, and images

### Visualization Interface
- Filter slabs by type (all, marble, granite, quartzite)
- Gallery view with image previews
- Drag-and-drop kitchen photo upload
- Project naming for organization
- Real-time generation status

### Before/After Comparison
- Interactive slider control
- Drag to reveal before/after
- Touch-friendly for tablets
- High-resolution image support
- Labels for clarity

### Project History
- View all past visualizations
- Quick access to before/after comparisons
- Delete unwanted projects
- Sort by date (newest first)

## Prompt Templates

The app includes optimized AI prompts for each stone type:

### Marble
"Photorealistic marble stone with natural veining, polished surface with subtle reflections, high-end luxury appearance, correct scale and proportion, realistic lighting"

### Granite
"Photorealistic granite stone with natural speckled pattern, polished surface with depth, high-end luxury appearance, correct scale and proportion, realistic lighting and reflections"

### Quartzite
"Photorealistic quartzite stone with natural crystalline pattern and veining, polished surface with subtle shimmer, high-end luxury appearance, correct scale and proportion, realistic lighting"

## Security Features

- **Row Level Security**: Database enforces access control
- **Authentication Required**: No anonymous access
- **Admin-Only Functions**: Inventory management restricted
- **User Data Isolation**: Users only see their own projects
- **Secure Image Storage**: User folders isolated by ID

## Common Tasks

### Make a User Admin
```sql
UPDATE profiles SET is_admin = true WHERE email = 'user@email.com';
```

### Delete All Projects for a User
```sql
DELETE FROM projects WHERE user_id = 'user-uuid';
```

### View All Active Slabs
```sql
SELECT name, type, created_at FROM slabs WHERE is_active = true ORDER BY created_at DESC;
```

### Check Storage Usage
Go to Supabase Dashboard > Storage > Browse buckets

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env` file exists
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_SUPABASE_ANON_KEY are set
- Restart dev server after changes

### "Access Denied" on Admin Page
- Check if user is marked as admin in database
- Run: `UPDATE profiles SET is_admin = true WHERE email = 'your@email.com';`

### Images Not Uploading
- Check Supabase Storage buckets exist (slab-images, project-images)
- Verify storage policies are created
- Check browser console for errors

### Build Errors
- Run `npm install` to ensure all dependencies installed
- Check TypeScript version compatibility
- Clear node_modules and reinstall if needed

## Production Deployment

### Build for Production
```bash
npm run build
```

Output will be in `dist/` folder.

### Deploy Options
- **Vercel**: Connect GitHub repo, auto-deploy
- **Netlify**: Drag and drop `dist` folder
- **Supabase Hosting**: Follow their deployment guide
- **Custom Server**: Serve `dist` folder with any web server

### Edge Function Deployment
```bash
supabase functions deploy generate-visualization
```

Or manually via Supabase Dashboard.

## Next Steps

1. **Add Sample Slabs**: Upload 5-10 stone slab images
2. **Test Workflow**: Create a test visualization end-to-end
3. **Configure AI**: Set up OpenAI or Stable Diffusion API
4. **Customize Branding**: Update colors, logo, and text
5. **Deploy**: Push to production hosting

## Support Resources

- Full documentation: `README.md`
- AI integration: `OPENAI_SETUP.md`
- Database schema: `database-setup.sql`
- Supabase docs: https://supabase.com/docs
- React docs: https://react.dev/

## Cost Estimates

### Supabase (Free Tier)
- 500MB database storage
- 1GB file storage
- 2GB bandwidth
- Upgrade: $25/month for Pro

### AI Generation
- OpenAI GPT-4 Vision: ~$0.01 per image
- DALL-E 3: ~$0.04-0.08 per image
- Stable Diffusion: ~$0.002 per second
- Monthly estimate: $50-200 for moderate use

---

**Built and ready to deploy!**

The application is production-ready with clean code, proper security, and a professional UI optimized for stone fabrication and interior design professionals.
