import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/database';

export async function GET() {
  let client;
  
  try {
    client = await getDbClient();
    
    // Simple test query first
    const testResult = await client.query('SELECT 1 as test');
    console.log('Database connection test:', testResult.rows[0]);
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tbl_mon_licenses'
      );
    `);
    console.log('Table exists:', tableExists.rows[0].exists);
    
    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        error: 'Table tbl_mon_licenses does not exist',
        total: 0,
        active: 0,
        expired: 0,
        expiringSoon: 0
      });
    }
    
    // Get simple count
    const countResult = await client.query('SELECT COUNT(*) as total FROM tbl_mon_licenses');
    const total = parseInt(countResult.rows[0].total);
    console.log('Total records:', total);
    
    return NextResponse.json({
      total,
      active: 0,
      expired: 0,
      expiringSoon: 0,
      debug: {
        dbConnected: true,
        tableExists: tableExists.rows[0].exists,
        totalRecords: total
      }
    });
    
  } catch (error) {
    console.error('Database error in stats endpoint:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Database connection failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}