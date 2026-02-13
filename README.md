# LithoVision

A professional stone slab visualization platform for countertops and interior surfaces. LithoVision allows designers, fabricators, and showrooms to realistically visualize how different stone materials (marble, granite, quartzite) will look in actual kitchen and interior spaces.

## Features

### For Users
- **Slab Gallery**: Browse available stone slabs filtered by type
- **AI Visualization**: Upload kitchen photos and see how different slabs look applied to countertops
- **Before/After Comparison**: Interactive slider to compare original vs. visualized results
- **Project History**: Save and revisit all your visualizations
- **High-Quality Results**: Photorealistic renders suitable for client presentations

### For Admins
- **Inventory Management**: Upload and manage stone slab inventory
- **Material Organization**: Categorize slabs by type (marble, granite, quartzite)
- **Activation Control**: Enable/disable slabs from user view

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Edge Functions**: Deno-based serverless functions
- **AI Integration**: OpenAI GPT-4 Vision / Stable Diffusion
- **Styling**: Custom CSS with modern design system

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
├── OPENAI_SETUP.md           # AI integration guide
└── package.json

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key (or Stable Diffusion API)

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
VITE_SUPABASE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 4. Database Setup

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database-setup.sql`
4. Run the SQL to create all tables, policies, and triggers

### 5. Storage Setup

The database setup automatically creates two storage buckets:
- `slab-images`: Public bucket for slab inventory photos
- `project-images`: Private bucket for user uploads and results

### 6. Create Admin User

Create your first admin user via Supabase:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" and create an account with email and password
3. In Supabase SQL Editor, run:
```sql
UPDATE profiles SET is_admin = true WHERE email = 'your@email.com';
```

Note: User sign-up is disabled in the app. All accounts must be created by administrators.

### 7. OpenAI Integration

See `OPENAI_SETUP.md` for detailed instructions on:
- Getting an OpenAI API key
- Configuring the Edge Function
- Alternative AI services (Stable Diffusion, etc.)
- Cost considerations

To add your OpenAI API key:
1. Go to Supabase Dashboard > Edge Functions
2. Add secret: `OPENAI_API_KEY` = `sk-your-key`

### 8. Deploy Edge Function

If using Supabase CLI:
```bash
supabase functions deploy generate-visualization
```

Or manually upload the function via Supabase Dashboard.

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

1. **Sign in** with your admin account
2. **Navigate to Admin** page
3. **Add slabs**:
   - Click "Add New Slab"
   - Enter name, type, and description
   - Upload high-quality slab image
   - Save
4. **Manage inventory**:
   - Edit slab details
   - Activate/deactivate slabs
   - Delete slabs if needed

### User Workflow

1. **Sign in** with your account credentials
2. **Go to Visualize** page
3. **Select a slab** from the gallery
4. **Upload a reference photo** of your kitchen/space
5. **Enter a project name**
6. **Click "Generate Visualization"**
7. **View the result** with interactive before/after slider
8. **Save to projects** for future reference

### Viewing Project History

1. Go to **My Projects**
2. Browse all your visualizations
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

## Security Features

- **Row Level Security**: All database tables protected
- **Authentication Required**: No anonymous access
- **Role-Based Access**: Admin-only inventory management
- **User Isolation**: Users only see their own projects
- **Secure Storage**: User images isolated by user ID

## API Integration Notes

The current implementation provides a foundation for AI image generation. To enable full functionality:

1. **Add OpenAI API Key** to Supabase Edge Functions
2. **Consider alternatives** like Stable Diffusion for better image-to-image results
3. **See OPENAI_SETUP.md** for detailed integration options

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

## Roadmap

- [ ] Stable Diffusion integration
- [ ] Multiple surface support (islands, backsplashes)
- [ ] Lighting adjustment controls
- [ ] Batch processing
- [ ] Mobile app version
- [ ] AR preview capability
- [ ] Integration with fabrication systems

---

Built with modern web technologies for professional stone visualization.
