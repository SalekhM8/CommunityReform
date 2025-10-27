# Deployment Guide - Community Reform CIC Website

## Quick Start (Local Preview)

The website is currently running locally at:
**http://localhost:8000**

## File Checklist

- ✅ Logo added (`assets/logo.jpeg`)
- ✅ Placeholder images from Unsplash (temporary)
- ✅ Responsive design implemented
- ✅ Contact form with validation
- ✅ Admin section (login + dashboard)
- ⚠️ Backend integration needed for production

## Deployment Options

### Option 1: Static Hosting (Recommended for Demo)

**Netlify** (Free, Easy)
1. Create account at netlify.com
2. Drag and drop your project folder
3. Site goes live instantly
4. Custom domain available

**GitHub Pages** (Free)
1. Push code to GitHub repository
2. Enable GitHub Pages in repo settings
3. Site live at `username.github.io/repo-name`

**Vercel** (Free)
1. Import GitHub repository to vercel.com
2. Automatic deployments on git push
3. Fast CDN and custom domains

### Option 2: Traditional Web Hosting

**Requirements:**
- Web hosting with PHP/Node.js support (for backend)
- FTP/SFTP access
- Domain name

**Steps:**
1. Upload all files via FTP to public_html or www directory
2. Ensure file permissions: 644 for files, 755 for directories
3. Point domain to hosting
4. Install SSL certificate (Let's Encrypt)

### Option 3: Full Stack with Backend

**For Production Form Submissions & Admin:**

1. **Backend Setup**
   ```bash
   # Example with Node.js/Express
   npm init -y
   npm install express nodemailer jsonwebtoken bcrypt
   ```

2. **Database**
   - MongoDB (cloud: MongoDB Atlas)
   - PostgreSQL (cloud: Heroku, Railway)
   - MySQL (traditional hosting)

3. **Form Handler** (example endpoint)
   ```javascript
   app.post('/api/contact', async (req, res) => {
     // Validate input
     // Save to database
     // Send email notification
     // Return success response
   });
   ```

4. **Authentication**
   - Implement JWT or session-based auth
   - Hash passwords with bcrypt
   - Add CSRF protection

## Image Optimization

### Current Placeholder Images
The site uses Unsplash URLs for placeholders. For production:

1. **Replace with actual photos**
   - Take high-quality photos of your programmes
   - Show real people and activities (get permission)

2. **Optimize images**
   - Use https://tinypng.com or https://squoosh.app
   - Target: < 200KB per image
   - Format: WebP (with JPG fallback)

3. **Recommended images needed**
   - Hero: Community gathering/youth activities (800x800px)
   - Boxing: Women's boxing training (800x600px)
   - Youth: Youth club activities
   - Community: Warm hub/community centre
   - Education: Learning sessions

## Performance Checklist

- ✅ Lightweight CSS (no frameworks)
- ✅ Vanilla JavaScript (no jQuery)
- ✅ Lazy loading enabled
- ✅ Debounced scroll events
- ⚠️ Optimize images before production
- ⚠️ Enable compression on server
- ⚠️ Add caching headers
- ⚠️ Consider CDN for assets

## SEO Optimization

### Before Launch:

1. **Meta Tags** (add to `<head>` in index.html)
   ```html
   <meta name="description" content="Community Reform CIC...">
   <meta name="keywords" content="community, Birmingham, youth clubs, boxing, education">
   <meta property="og:title" content="Community Reform CIC">
   <meta property="og:image" content="URL to social share image">
   <meta name="twitter:card" content="summary_large_image">
   ```

2. **Create sitemap.xml**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url><loc>https://yourdomain.com/</loc></url>
     <url><loc>https://yourdomain.com/admin</loc></url>
   </urlset>
   ```

3. **Google Analytics**
   - Create GA4 property
   - Add tracking code to all pages

4. **Google Search Console**
   - Verify domain ownership
   - Submit sitemap
   - Monitor indexing

## Security Considerations

### For Production:

1. **HTTPS Required**
   - Get SSL certificate (free with Let's Encrypt)
   - Force HTTPS redirect

2. **Admin Section**
   - Change default credentials
   - Implement rate limiting
   - Add 2FA if possible
   - Session timeout
   - CSRF tokens

3. **Contact Form**
   - Implement CAPTCHA (reCAPTCHA v3)
   - Server-side validation
   - Email verification
   - Rate limiting (max submissions per IP)

4. **Headers** (add to server config)
   ```
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   X-XSS-Protection: 1; mode=block
   Referrer-Policy: strict-origin-when-cross-origin
   ```

## Domain Setup

1. **Purchase Domain**
   - Recommended: Namecheap, Google Domains, Cloudflare
   - Suggestion: `communityreform.org.uk` or `.co.uk`

2. **DNS Configuration**
   ```
   A Record: @ → Server IP
   CNAME: www → yourdomain.com
   ```

3. **Email Setup**
   - Google Workspace or Zoho Mail
   - Configure: info@communityreform.org.uk

## Testing Before Launch

- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices (iOS and Android)
- [ ] Test all links work
- [ ] Test contact form (with real email)
- [ ] Verify images load
- [ ] Check loading speed (use PageSpeed Insights)
- [ ] Test with screen reader (accessibility)
- [ ] Spell check all content

## Post-Launch

1. **Monitor**
   - Google Analytics for traffic
   - Form submissions
   - Server uptime
   - Page load times

2. **Regular Updates**
   - Update statistics regularly
   - Add news/updates section
   - Keep programme info current
   - Update photos seasonally

3. **Backup**
   - Weekly backups of site files
   - Database backups (if applicable)
   - Keep local copy

## Support Resources

- **Hosting Issues**: Contact your hosting provider
- **Domain Issues**: Check domain registrar
- **Code Issues**: Review browser console for errors
- **Email Issues**: Verify SMTP settings

## Estimated Costs

**Basic Setup (Static Site):**
- Domain: £10-15/year
- Hosting: £0-10/month (Netlify/Vercel free tier)
- Email: £5-15/month (optional)

**Full Setup (With Backend):**
- Domain: £10-15/year
- Hosting: £15-50/month (VPS/Cloud)
- Database: £0-25/month
- Email: £5-15/month

---

**Current Status:** ✅ Development complete, ready for deployment
**Next Step:** Choose hosting option and deploy
**Estimated Time:** 1-2 hours for basic deployment

