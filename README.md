# Visitor Tracking & Geo-Restriction App

A full-stack application that tracks visitor access, detects bots, and enforces geographic restrictions. Built with React, Express, and PostgreSQL.

## Features

- **Bot Detection**: Identifies and blocks automated crawlers and bots
- **Geo-Restriction**: Allows access only from specified countries (Australia & Nigeria by default)
- **Real-time Logging**: Tracks all visitor attempts (allowed and blocked)
- **Telegram Notifications**: Optional alerts for visitor activity
- **Admin Dashboard**: View visitor logs at `/visit`
- **Database Persistence**: Stores logs in PostgreSQL (Neon compatible)

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Express, TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **Deployment**: Netlify (frontend) + Replit/Railway/Render (backend)

## Quick Start (Local Development)

1. **Clone and Install**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   Create a `.env` file (see `.env.example`):
   ```bash
   DATABASE_URL=postgresql://...  # Optional for local dev (uses memory by default)
   TELEGRAM_BOT_TOKEN=...         # Optional
   TELEGRAM_CHAT_ID=...           # Optional
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5000`

4. **Access Admin Panel**:
   Visit `http://localhost:5000/visit` to see visitor logs

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utility functions
│   │   └── App.tsx         # Main app component
├── server/                 # Express backend
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Data access layer
│   └── index.ts            # Server entry point
├── shared/                 # Shared code
│   └── schema.ts           # Database schema & types
├── migrations/             # Database migrations
└── package.json            # Dependencies
```

## API Endpoints

- `POST /api/visits` - Log a visitor attempt
- `GET /api/visits` - Retrieve visitor logs
- `DELETE /api/visits` - Clear all visitor logs

## Routes

- `/` - Home page (geo-restricted)
- `/visit` - Admin dashboard (always accessible)
- `/access-denied` - Blocked visitor page

## Configuration

### Allowed Countries

Edit `client/src/components/geo-guard.tsx`:

```typescript
if (country === 'AU' || country === 'NG') {
  // Add more countries: country === 'US' || country === 'UK'
}
```

### Bot Detection

Customize bot detection rules in `client/src/components/geo-guard.tsx`:

```typescript
const botSignatures = [
  'bot', 'spider', 'crawl', // Add or remove signatures
];
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Netlify with a Neon database.

## Database Schema

### visit_logs
- `id` (UUID) - Primary key
- `timestamp` (Timestamp) - When the visit occurred
- `type` (Text) - 'Human' or 'Bot'
- `country` (Text) - Country name and code
- `ip` (Text) - IP address (optional)
- `status` (Text) - 'Allowed' or 'Blocked'
- `details` (Text) - Additional information
- `user_agent` (Text) - Browser user agent (optional)

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:generate  # Generate database migrations
npm run db:push      # Push schema changes to database
```

## License

MIT

## Support

For issues or questions, check the [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section.
