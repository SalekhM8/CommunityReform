# Community Reform CIC Website

A modern, professional website for Community Reform CIC - Building stronger communities through empowerment and engagement.

## Features

- ✨ **Modern Design**: Clean, vibrant aesthetic combining professionalism with accessibility
- 🎨 **Natural Color Palette**: Inspired by the organization's logo with orange, teal, blue, and pink accents
- 📱 **Fully Responsive**: Optimized for all devices from mobile to desktop
- ⚡ **High Performance**: Lightweight, fast-loading with optimized assets
- 🎭 **Smooth Animations**: Scroll-triggered animations, counter animations, and parallax effects
- 📋 **Contact Form**: Integrated form with validation for service inquiries
- 🧾 **Childcare Enquiry Form**: Eligibility questions, live appointment slots and
  automatic confirmations/reminders through Cal.com

## Structure

```
CommunityReform/
├── index.html              # Main landing page
├── childcare-enquiry.html  # Childcare eligibility & enquiry form
├── privacy.html            # Privacy notice (linked from the form's consent box)
├── enquiry.js              # Enquiry form logic + Cal.com booking integration
├── CALCOM-SETUP.md         # Cal.com setup + what is already configured
├── styles.css              # All styles and responsive design
├── script.js               # JavaScript for animations and interactions
├── assets/                 # Images and logo
│   ├── logo.jpeg           # Organization logo ✅
│   └── LOGO_INSTRUCTIONS.txt
├── CIC Logo.jpeg           # Original logo file
├── .gitignore              # Git ignore rules
└── README.md               # This file
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

## Running this site locally

The site is plain HTML/CSS/JS with no build step. To preview it on your own computer:

```bash
./serve.sh              # then open http://localhost:8080
./serve.sh 3000         # or pick any other port
```

Or the long way round, from this folder:

```bash
python3 -m http.server 8080
```

Then open **http://localhost:8080/** for the home page, or
**http://localhost:8080/childcare-enquiry.html** for the enquiry form.

A few things worth knowing:

- **Always use `http://localhost:…`, not `file://`.** The appointment calendar
  talks to Cal.com, and browsers block those requests from pages opened by
  double-clicking the file.
- Stop the server with **Ctrl+C**.
- When you change `styles.css` or `enquiry.js`, bump the `?v=` number on those
  file names in the HTML (there is a reminder comment in
  `childcare-enquiry.html`). That is what stops visitors — and you — seeing a
  stale cached copy.
- The enquiry form is already wired to the live Cal.com account, so a test
  submission creates a **real** booking and sends real emails. Cancel test
  bookings in Cal.com afterwards (see `CALCOM-SETUP.md`).

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
- The earlier `admin.html` / `dashboard.html` pages were removed from the site
- **Important**: if content management is needed again, build it with proper
  authentication and a backend

## Childcare Enquiry Form

`childcare-enquiry.html` is the Zawia Masjid childcare eligibility and enquiry form. It is
**fully automated with no backend to maintain** — the only third-party service is Cal.com,
which is free for this use.

What it does:

- Parents and carers complete the enquiry form (parent details, children and ages,
  employment, benefits, what help they need, consent) and pick an appointment.
- Appointment times are pulled live from Cal.com, so **only genuinely free slots are shown**
  and **double bookings are impossible**.
- On submit, Cal.com automatically emails the parent a confirmation, notifies
  `info@crcic.co.uk`, and sends a reminder to both the day before the appointment.
- Staff manage bookings (accept, cancel, reschedule) in the Cal.com dashboard.
- A privacy notice lives on its own page (`privacy.html`), and the consent checkbox
  links to it (opening in a new tab so nobody loses their place in the form).

**Status: switched on.** The form is already connected to the CIC's Cal.com account
(`crcic` / `childcare-appointment`) and is taking real appointments. `CALCOM-SETUP.md`
records the live configuration (opening hours, limits, booking questions, reminder
workflows) and how to change it.

To point the form at a different Cal.com account or event type, edit the `CALCOM`
block at the top of `enquiry.js` (username + slug).

If those two values are ever blank, the form still works: the appointment section
explains that online booking isn't live and the submit button opens a pre-filled
email to `info@crcic.co.uk`.

### Notes on the free setup

- Email wording is Cal.com's default template on the free plan (custom text and SMS
  reminders need their paid Teams plan, around $12–16 per user/month).
- Booking data is processed by Cal.com in the US, under their DPA and the UK Extension to
  the EU–US Data Privacy Framework. This is explained to parents in the privacy notice.
- No documents, bank details or benefit account logins are ever collected.

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

