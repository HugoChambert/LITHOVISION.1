# Keyboard Shortcuts

LITHOVISION supports keyboard shortcuts for quick access to features.

## Available Shortcuts

### Admin Access
**Ctrl + Shift + A**
- Opens the hidden Admin page for inventory management
- The Admin page is not visible in the navigation menu
- Use this shortcut from any page to access slab management features

## Why Hidden Admin?

The admin functionality is hidden from the main navigation to:
- Provide a cleaner, simpler interface for end users
- Prevent accidental modifications to slab inventory
- Keep the focus on the core visualization features
- Allow quick access for authorized personnel who know the shortcut

## Admin Features

Once accessed via the keyboard shortcut, the Admin page allows you to:
- Add new stone slabs to the inventory
- Edit existing slab details (name, type, description)
- Upload high-quality slab images
- Activate/deactivate slabs from the gallery
- Delete slabs that are no longer needed

## Navigation

To return to the main application:
- Click "Visualize" in the navigation
- Click "Projects" in the navigation
- Click the "LITHOVISION" logo to return to the Visualize page

## Browser Compatibility

The keyboard shortcut works in all modern browsers:
- Chrome/Edge: Ctrl + Shift + A
- Firefox: Ctrl + Shift + A
- Safari: Ctrl + Shift + A
- Opera: Ctrl + Shift + A

Note: On Mac, use Cmd instead of Ctrl if the default doesn't work, though Ctrl should work universally in web applications.

## Adding More Shortcuts

To add additional keyboard shortcuts, modify the `useEffect` hook in `src/components/layout/Header.tsx`:

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Admin shortcut
    if (event.ctrlKey && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      navigate('/admin');
    }

    // Add more shortcuts here
    // Example: Ctrl + Shift + V for Visualize
    // if (event.ctrlKey && event.shiftKey && event.key === 'V') {
    //   event.preventDefault();
    //   navigate('/visualize');
    // }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [navigate]);
```

---

For questions about keyboard shortcuts or feature requests, refer to the main README.md.
