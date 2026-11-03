import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Safe Pool Configurations
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,        // Max active connections
  idleTimeoutMillis: 30000,                                 // Close idle clients after 30s
  connectionTimeoutMillis: 2000,                            // Fail fast (2s) if pool can't get a connection
});

// CRITICAL: Handle unexpected errors on idle pool clients
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
  // Do NOT process.exit() here; the pool will automatically discard the bad client
});

export default {
  /**
   * Safe shortcut query helper for standard single queries.
   * Automatically borrows and returns a client to the pool.
   */
  query: (text, params) => pool.query(text, params),

  /**
   * Acquired client for multi-query Transactions (BEGIN...COMMIT/ROLLBACK).
   * IMPORTANT: You MUST call client.release() in a try...finally block.
   */
  getClient: () => pool.connect(),

  /**
   * Helper for Graceful Shutdowns (SIGINT/SIGTERM)
   */
  closePool: () => pool.end(),
};