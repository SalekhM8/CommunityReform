# Community Reform CIC Website

A modern, professional website for Community Reform CIC - Building stronger communities through empowerment and engagement.

## Features

- ✨ **Modern Design**: Clean, vibrant aesthetic combining professionalism with accessibility
- 🎨 **Natural Color Palette**: Inspired by the organization's logo with orange, teal, blue, and pink accents
- 📱 **Fully Responsive**: Optimized for all devices from mobile to desktop
- ⚡ **High Performance**: Lightweight, fast-loading with optimized assets
- 🎭 **Smooth Animations**: Scroll-triggered animations, counter animations, and parallax effects
- 📋 **Contact Form**: Integrated form with validation for service inquiries
- 🔐 **Admin Section**: Secure admin login and dashboard for content management

## Structure

```
CommunityReform/
├── index.html          # Main landing page
├── admin.html          # Admin login page
├── dashboard.html      # Admin dashboard
├── styles.css          # All styles and responsive design
├── script.js           # JavaScript for animations and interactions
├── assets/             # Images and logo
│   ├── logo.jpeg       # Organization logo ✅
│   └── LOGO_INSTRUCTIONS.txt
├── CIC Logo.jpeg       # Original logo file
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Setup

1. **Logo** ✅
   - Logo has been added to `assets/logo.jpeg`
   - Displays in navigation, footer, and admin pages

2. **Placeholder Images** ✅
   - Temporary placeholder images from Unsplash are currently used
   - Replace these with actual photos of your programmes:
     - Hero section: Community engagement photo
     - Boxing programme: Women's boxing training photos
   - Optimize images for web (use tools like TinyPNG or ImageOptim)
   - Recommended format: WebP or optimized JPG/PNG
   - Keep file sizes under 500KB for best performance

3. **Customize Content**
   - All content is already populated based on your programme information
   - Edit `index.html` to update any text or add new sections
   - Update contact information in the contact section

4. **Deploy**
   - Upload all files to your web hosting service
   - Ensure proper file permissions (644 for files, 755 for directories)
   - Configure SSL certificate for HTTPS

## Customization

### Colors

The color scheme is defined in CSS custom properties in `styles.css`:

```css
--primary-orange: #F47920;
--primary-teal: #4FADA7;
--primary-blue: #5BA6D6;
--primary-pink: #E94190;
--accent-green: #7CC04E;
```

To change colors, edit these values at the top of the CSS file.

### Typography

The site uses the Inter font from Google Fonts. To change the font:

1. Update the Google Fonts link in `index.html`
2. Change the `--font-primary` variable in `styles.css`

### Sections

To add or remove sections:

1. Edit the HTML structure in `index.html`
2. Add corresponding styles in `styles.css`
3. Include fade-in animations by adding the `fade-in-section` class

## Key Sections

### 1. Hero Section
- Main landing area with headline and call-to-action
- Features gradient background matching organization colors
- Responsive buttons leading to programmes and contact

### 2. Statistics Section
- Animated counters showing impact metrics
- Automatically counts up when scrolled into view
- Edit numbers by changing `data-target` attributes

### 3. Programmes Overview
- **Get Active**: Women's Boxing Club details
- **Community Centre**: Warm hubs, food bank, celebrations
- **Youth Clubs**: Open access and specialist programmes
- **Training & Education**: Learning and skills development
- **Information, Advice & Guidance**: Support services and partnerships

### 4. Impact Timeline
- Visual timeline showing organizational growth
- Scroll-triggered animations
- Edit years and content in HTML

### 5. Contact Form
- Validated contact form with service selection
- Currently uses client-side validation
- **Important**: Integrate with backend for actual form submission

### 6. Admin Section
- Login page at `/admin.html`
- Dashboard at `/dashboard.html`
- **Important**: Implement proper authentication and backend integration

## Form Integration

The contact form currently uses JavaScript simulation. To make it functional:

1. **Backend API**: Create an endpoint to receive form submissions
2. **Update JavaScript**: Modify the form submission handler in `script.js`
3. **Email Integration**: Use services like SendGrid, Mailgun, or AWS SES
4. **Database**: Store submissions in a database for admin access

Example API integration:

```javascript
const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
```

## Admin Integration

The admin section is currently a frontend-only demo. For production:

1. **Authentication**: Implement JWT or session-based authentication
2. **Backend API**: Create endpoints for CRUD operations
3. **Database**: Store user data, submissions, and content
4. **Security**: Add CSRF protection, rate limiting, and input validation

Recommended backend technologies:
- Node.js with Express
- Python with Flask/Django
- PHP with Laravel

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lightweight CSS (no frameworks)
- Vanilla JavaScript (no jQuery)
- Lazy loading for images
- Debounced scroll events
- Optimized animations with CSS transforms

## Accessibility

- Semantic HTML5 structure
- ARIA labels where appropriate
- Keyboard navigation support
- High contrast text
- Responsive font sizes

## SEO

- Semantic HTML structure
- Meta descriptions
- Proper heading hierarchy
- Fast load times
- Mobile-friendly design

To improve SEO:
1. Add more detailed meta tags
2. Create a sitemap.xml
3. Add schema.org markup
4. Optimize images with alt text
5. Add Open Graph tags for social sharing

## Maintenance

### Regular Updates
- Update statistics in the stats section
- Add new timeline items as the organization grows
- Update programme information as services expand
- Keep contact information current

### Image Guidelines
- Use high-quality, professional photos
- Ensure photos represent diversity and inclusion
- Compress images before uploading
- Use descriptive filenames and alt text

## Support

For technical support or customization inquiries, contact your web developer.

## License

© 2025 Community Reform CIC. All rights reserved. EST. 2022

---

Built with modern web standards, optimized for performance and user experience.

