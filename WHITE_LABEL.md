# White Label Configuration

LithoVision is now configured as a white-label application with restricted authentication.

## Changes Made

### 1. Authentication Restrictions

- **Sign-up disabled**: Users can no longer create their own accounts through the application
- **Admin-only account creation**: All user accounts must be created by administrators via Supabase Dashboard
- **Simplified login**: The authentication form now only shows sign-in fields

### 2. User Account Management

#### Creating New User Accounts

Administrators must create user accounts through the Supabase Dashboard:

1. Log into Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add User"**
4. Enter email and password
5. Click **"Create User"**

The new user can now sign in to the application with their credentials.

#### Creating Admin Accounts

To grant admin privileges to a user:

1. Create the user account (see above)
2. Open Supabase **SQL Editor**
3. Run the following SQL:

```sql
UPDATE profiles SET is_admin = true WHERE email = 'user@email.com';
```

Admin users will have access to:
- Slab inventory management
- Upload new stone materials
- Edit and deactivate slabs
- All standard user features

### 3. Branding

The authentication page now displays:
- Generic "Sign In" heading
- "Access your account to continue" subtitle
- No company-specific branding

To customize the branding for your business:

1. Update the header logo in `src/components/layout/Header.tsx`
2. Modify the authentication page title in `src/components/auth/AuthForm.tsx`
3. Update colors in `src/styles/global.css`
4. Replace favicon and meta tags in `index.html`

### 4. Access Control

- All routes require authentication
- Unauthenticated users are redirected to `/auth`
- Once authenticated, users default to `/visualize`
- Admin-only pages are protected by role checks

### 5. Security Features

- Row Level Security (RLS) on all database tables
- User data isolation (users only see their own projects)
- Admin-only access to inventory management
- Secure authentication via Supabase Auth

## Deployment Notes

When deploying this white-label application:

1. **Create initial admin account** via Supabase Dashboard
2. **Configure environment variables** for production
3. **Update branding** to match client requirements
4. **Test authentication** thoroughly before launch
5. **Document account creation process** for client administrators

## User Management Best Practices

### For Administrators

- Create user accounts on request through Supabase Dashboard
- Use strong, unique passwords for each account
- Grant admin privileges sparingly
- Regularly review user access in Supabase Dashboard
- Remove inactive user accounts

### For End Users

- Users must contact an administrator to receive account credentials
- Users should change their password after first login (via profile settings if implemented)
- Users cannot create additional accounts themselves
- Lost passwords must be reset by administrators

## Future Customization Options

To further white-label the application:

1. **Custom domain**: Deploy on client's domain
2. **Email templates**: Customize Supabase Auth email templates
3. **Logo and colors**: Match client's brand identity
4. **Custom footer**: Add client contact information
5. **Terms and privacy**: Add client-specific legal pages
6. **Welcome email**: Create onboarding flow for new users

## Support and Maintenance

When supporting clients using this white-label version:

- Provide clear instructions for creating user accounts
- Document the admin user creation process
- Train client administrators on user management
- Set up monitoring for authentication issues
- Maintain security updates regularly

---

For technical support or questions about white-label deployment, refer to the main README.md and SETUP_GUIDE.md.
