import { NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET() {
  try {
    const pool = getPool();
    
    // Get total count first
    const totalQuery = `SELECT COUNT(*) as total FROM tbl_crjr`;
    const totalResult = await pool.query(totalQuery);
    
    // Initialize stats with total count
    const stats = {
      total: parseInt(totalResult.rows[0].total) || 0,
      completed: 0,
      inProgress: 0,
      pending: 0
    };
    
    
    // If there are records, try to get status breakdown
    if (stats.total > 0) {
      // Try different possible status column names
      const possibleStatusColumns = ['status', 'tipe_pekerjaan', 'priority'];
      
      for (const column of possibleStatusColumns) {
        try {
          const statusQuery = `
            SELECT ${column}, COUNT(*) as count
            FROM tbl_crjr
            GROUP BY ${column}
          `;
          
          const statusResult = await pool.query(statusQuery);
          
          // Map results based on the column type
          statusResult.rows.forEach(row => {
            const value = row[column]?.toLowerCase() || '';
            const count = parseInt(row.count) || 0;
            
            if (column === 'status') {
              // Map status values
              if (value.includes('completed') || value.includes('done') || value.includes('selesai')) {
                stats.completed += count;
              } else if (value.includes('progress') || value.includes('development') || value.includes('testing')) {
                stats.inProgress += count;
              } else if (value.includes('pending') || value.includes('menunggu') || value.includes('waiting')) {
                stats.pending += count;
              }
            } else if (column === 'tipe_pekerjaan') {
              // Map by work type
              if (value.includes('jr') || value.includes('job request')) {
                stats.inProgress += count;
              } else if (value.includes('cr') || value.includes('change request')) {
                stats.pending += count;
              }
            } else if (column === 'priority') {
              // Map by priority
              if (value.includes('high') || value.includes('urgent')) {
                stats.inProgress += count;
              } else if (value.includes('medium') || value.includes('low')) {
                stats.pending += count;
              }
            }
          });
          
          break; // If successful, break out of the loop
        } catch (error) {
          continue;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching CR/JR stats:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch CR/JR stats',
      data: {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0
      }
    }, { status: 500 });
  }
}
