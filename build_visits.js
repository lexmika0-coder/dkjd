const fs = require('fs');

// Read the original bundled file to get the Neon library code
const original = fs.readFileSync('netlify_upload/netlify/functions/visits.js.bak', 'utf8');

// We need to rebuild with the library. For now, let's create a simpler version
// that uses fetch directly to Neon's HTTP API

const newCode = `
import { neon } from '@neondatabase/serverless';

let sql;

function getDb() {
  if (!sql && process.env.DATABASE_URL) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export async function handler(event, context) {
  const db = getDb();
  
  if (!db) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Database not configured' })
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await db\`
      CREATE TABLE IF NOT EXISTS visit_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        type TEXT NOT NULL,
        country TEXT NOT NULL,
        ip TEXT,
        status TEXT NOT NULL,
        details TEXT NOT NULL,
        user_agent TEXT
      )
    \`;

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const result = await db\`
        INSERT INTO visit_logs (type, country, ip, status, details, user_agent)
        VALUES (\${body.type}, \${body.country}, \${body.ip || null}, \${body.status}, \${body.details}, \${body.userAgent || null})
        RETURNING *
      \`;
      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    if (event.httpMethod === 'GET') {
      const logs = await db\`SELECT * FROM visit_logs ORDER BY timestamp DESC LIMIT 100\`;
      return { statusCode: 200, headers, body: JSON.stringify(logs) };
    }

    if (event.httpMethod === 'DELETE') {
      await db\`DELETE FROM visit_logs\`;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Database Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
`;

console.log('New visits.js code created');
