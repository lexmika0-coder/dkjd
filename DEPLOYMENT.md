# Deployment Guide: Netlify + Neon Database

This guide will help you deploy your visitor tracking app to Netlify with a Neon PostgreSQL database.

## Prerequisites

- A [Netlify](https://netlify.com) account
- A [Neon](https://neon.tech) account (free tier available)
- Node.js installed locally

## Step 1: Create a Neon Database

1. Go to [Neon](https://neon.tech) and sign up/login
2. Click **"Create a project"**
3. Choose a name for your database (e.g., "visitor-tracker")
4. Select a region close to your users (Australia or Nigeria recommended)
5. Click **"Create project"**
6. **Copy the connection string** - it looks like:
   ```
   postgresql://user:password@ep-cool-name-123456.region.aws.neon.tech/neondb
   ```

## Step 2: Run Database Migrations

Before deploying, you need to set up the database tables:

1. On your local machine, create a `.env` file:
   ```bash
   DATABASE_URL=your_neon_connection_string_here
   ```

2. Run the migration:
   ```bash
   npm install
   npx drizzle-kit push
   ```

This creates the `visit_logs` and `users` tables in your Neon database.

## Step 3: Build Your Application

```bash
npm run build
```

This creates a `dist` folder with your static files and a `dist-server` folder with your backend.

## Step 4: Deploy to Netlify

### Option A: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Deploy:
   ```bash
   netlify deploy --prod
   ```

4. When prompted:
   - **Publish directory**: `dist`
   - Follow the prompts to create a new site

### Option B: Deploy via Netlify Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop your **`dist`** folder
4. Your frontend is now live!

## Step 5: Deploy the Backend (API)

Since Netlify is static hosting, you need to deploy your backend separately.

### Recommended: Deploy Backend to Replit

1. Keep your Replit project running (this is your backend)
2. Note your Replit URL: `https://your-repl-name.repl.co`

### Update Frontend to Use Your Backend

In your Netlify deployment, the frontend will need to know where the backend is:

1. Create a `.env` file in the project root:
   ```bash
   VITE_API_URL=https://your-backend-url.replit.app
   ```

2. Rebuild with the environment variable:
   ```bash
   npm run build
   ```

3. Deploy to Netlify:
   ```bash
   netlify deploy --prod
   ```

Alternatively, set `VITE_API_URL` in Netlify's environment variables before building.

### Alternative: Deploy Backend to Railway/Render

If you prefer not to use Replit for production:

1. Create account on [Railway](https://railway.app) or [Render](https://render.com)
2. Connect your GitHub repository
3. Set environment variables:
   - `DATABASE_URL`: Your Neon connection string
   - `TELEGRAM_BOT_TOKEN`: (optional)
   - `TELEGRAM_CHAT_ID`: (optional)
4. Deploy the backend
5. Update your frontend API_URL to point to your new backend

## Step 6: Configure Environment Variables

### On Replit (if using Replit for backend):
1. Go to your Replit project
2. Click the "Secrets" tab (lock icon)
3. Add:
   - `DATABASE_URL`: Your Neon connection string
   - `TELEGRAM_BOT_TOKEN`: (optional)
   - `TELEGRAM_CHAT_ID`: (optional)

### On Railway/Render (if using alternative):
1. Go to your project settings
2. Add the same environment variables

## Step 7: Test Your Deployment

1. Visit your Netlify URL
2. The site should detect your location and log it
3. Visit `/visit` to see the visitor logs
4. Check your Neon database to confirm data is being saved

## Folder Structure for Download

When you download this project, you'll get:

```
your-project/
├── client/              # Frontend React app
├── server/              # Backend Express API
├── shared/              # Shared types and schema
├── migrations/          # Database migrations
├── .env.example         # Example environment variables
├── package.json         # Dependencies
├── DEPLOYMENT.md        # This file
└── README.md            # Project documentation
```

## Troubleshooting

### "Failed to connect to database"
- Check your `DATABASE_URL` is correct
- Make sure your IP is allowed in Neon (it should allow all by default)
- Verify migrations ran successfully

### "API calls failing"
- Check your API_URL is correct in the frontend
- Make sure your backend is running
- Check CORS settings if needed

### "Visitor logs not showing"
- Open browser console (F12) to check for errors
- Verify the `/api/visits` endpoint is responding
- Check the backend logs

## Cost Estimate

- **Neon Database**: FREE for up to 3GB storage
- **Netlify Frontend**: FREE for unlimited static hosting
- **Backend (Replit)**: FREE with limitations, or $7/month for always-on
- **Backend (Railway)**: FREE tier available, then $5/month
- **Backend (Render)**: FREE tier available

## Support

If you run into issues:
1. Check the browser console for errors
2. Check the backend logs
3. Verify your environment variables
4. Ensure migrations ran successfully
