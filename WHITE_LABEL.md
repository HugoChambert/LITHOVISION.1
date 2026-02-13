# White Label Configuration

LITHOVISION is now configured as a white-label application with **no authentication required**.

## Changes Made

### 1. Authentication Removed

- **No sign-in required**: The application is now open access - anyone can use it immediately
- **No user accounts**: Authentication has been completely removed from the application
- **Public access**: All features are available to all visitors without restrictions

### 2. Application Features

#### Available to Everyone

All features are now publicly accessible:
- **Visualizer**: Upload kitchen photos and apply stone slab visualizations
- **Projects**: View all created projects (no user isolation)
- **Admin**: Manage stone slab inventory (hidden from navigation, accessible via **Ctrl + Shift + A**)

#### Data Management

Since there's no authentication:
- All projects are publicly visible
- Anyone can create, view, and delete projects
- Admin features are accessible to all visitors
- No user-specific data isolation

### 3. Branding

To customize the branding for your business:

1. Update the header logo in `src/components/layout/Header.tsx`
2. Update application name and title in `index.html`
3. Modify colors and styling in `src/styles/global.css`
4. Replace favicon and meta tags in `index.html`
5. Update page titles and descriptions in each component

### 4. Access Control

- **No authentication required**: All routes are publicly accessible
- Users land directly on the `/visualize` page
- Admin features are available to all visitors
- No access restrictions or role-based controls

### 5. Database Configuration

To enable open access, you must run the provided database migration:

1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database-open-access.sql`
4. Execute the SQL to update Row Level Security policies

This migration:
- Removes user-specific access restrictions
- Enables public read/write access to all tables
- Makes storage buckets publicly accessible
- Allows anonymous project creation and management

## Deployment Notes

When deploying this white-label application:

1. **Run the database migration** (`database-open-access.sql`) to enable public access
2. **Configure environment variables** for production
3. **Update branding** to match client requirements
4. **Test all features** without authentication
5. **Consider adding basic security** if needed (IP restrictions, rate limiting, etc.)

## Important Security Considerations

Since this is now an open-access application:

### Potential Issues

- **No user isolation**: All projects are visible to everyone
- **No access control**: Anyone can modify or delete any data
- **Public admin access**: Inventory management is available to all visitors
- **Storage costs**: Unlimited public uploads may increase costs
- **Data integrity**: No protection against malicious deletions

### Recommended Protections

1. **Add basic authentication** at the hosting level (e.g., HTTP Basic Auth)
2. **Implement rate limiting** to prevent abuse
3. **Set up monitoring** for unusual activity
4. **Regular backups** of database and storage
5. **Consider IP whitelisting** if used internally
6. **Add CAPTCHA** to form submissions if needed

## Future Customization Options

To further white-label the application:

1. **Custom domain**: Deploy on client's domain
2. **Logo and colors**: Match client's brand identity
3. **Custom footer**: Add client contact information
4. **Terms and privacy**: Add client-specific legal pages
5. **Landing page**: Create a custom welcome page
6. **Contact forms**: Add support or inquiry forms

## Use Cases

This open-access configuration is ideal for:

- **Trade shows and demos**: Allow anyone to try the tool without signup friction
- **Internal company tools**: Used behind a firewall or VPN
- **Kiosk displays**: In showrooms where visitors can interact
- **Proof of concept**: Quick demos for potential clients
- **Single-user deployments**: Personal projects or small teams

## Support and Maintenance

When supporting clients using this white-label version:

- Monitor storage and database usage regularly
- Set up alerts for unusual activity patterns
- Perform regular backups of all data
- Keep Supabase and dependencies updated
- Consider implementing soft deletes for data recovery

---

For technical support or questions about white-label deployment, refer to the main README.md and SETUP_GUIDE.md.
