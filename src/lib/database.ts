import { Pool } from 'pg';

let pool: Pool | null = null;
let isConnected = false;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,  // Reduce pool size to avoid "too many clients"
      min: 1,  // Reduce minimum connections
      idleTimeoutMillis: 10000, // Reduce idle timeout
      connectionTimeoutMillis: 3000, // Reduce connection timeout
      statement_timeout: 8000,  // Reduce statement timeout
      query_timeout: 8000,      // Reduce query timeout
      allowExitOnIdle: true     // Allow exit on idle to free connections
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      isConnected = false;
    });

    pool.on('connect', (client) => {
      console.log('New client connected to database');
      isConnected = true;
    });

    // Test connection on startup
    testConnection();
  }
   return pool;
 }
 
 export async function testConnection(): Promise<boolean> {
   try {
     const client = await getPool().connect();
     await client.query('SELECT 1');
     client.release();
     isConnected = true;
     console.log('Database connection successful');
     return true;
   } catch (error) {
     console.error('Database connection failed:', error);
     isConnected = false;
     return false;
   }
 }
 
 export function isDbConnected(): boolean {
   return isConnected;
 }
 
 export async function getDbClient() {
   try {
     const client = await getPool().connect();
     return client;
   } catch (error) {
     console.error('Failed to get database client:', error);
     throw new Error('Database connection unavailable');
   }
 }

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}