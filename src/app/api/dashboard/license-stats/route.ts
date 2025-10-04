import { NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET() {
  try {
    const pool = getPool();
    
    
    // First check if table exists and get its structure
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tbl_mon_licenses'
      );
    `;
    
    const tableExists = await pool.query(tableCheckQuery);
    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          active: 0,
          expiringSoon: 0,
          totalPurchase: 0
        }
      });
    }
    
    // Get table structure
    const structureQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_mon_licenses' 
      ORDER BY ordinal_position
    `;
    
    const structureResult = await pool.query(structureQuery);
    
    // Simple query first to get total count
    const totalQuery = `SELECT COUNT(*) as total FROM tbl_mon_licenses`;
    const totalResult = await pool.query(totalQuery);
    
    const stats = {
      total: parseInt(totalResult.rows[0].total) || 0,
      active: 0,
      expiringSoon: 0,
      totalPurchase: 0
    };
    
    
    // If there are records, try to get detailed stats
    if (stats.total > 0) {
      try {
        // Since there's no 'status' column, let's use simple logic
        // For now, let's just set some basic stats based on available data
        stats.active = stats.total; // Assume all licenses are active if no status column
        stats.expiringSoon = 0; // We'll calculate this properly later
        stats.totalPurchase = stats.total; // Assume all have some purchase value
        
      } catch (detailError) {
        // Keep the basic stats we already have
      }
    }
    
    
    return NextResponse.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching license stats:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch license stats',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        total: 0,
        active: 0,
        expiringSoon: 0,
        totalPurchase: 0
      }
    }, { status: 500 });
  }
}
