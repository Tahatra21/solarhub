import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get statistics
    const [
      totalResult,
      statusResult,
      priorityResult,
      typeResult,
      bpoResult
    ] = await Promise.all([
      getPool().query('SELECT COUNT(*) as total FROM tbl_monitoring_run_program'),
      getPool().query(`
        SELECT overall_status, COUNT(*) as count 
        FROM tbl_monitoring_run_program 
        WHERE overall_status IS NOT NULL 
        GROUP BY overall_status 
        ORDER BY count DESC
      `),
      getPool().query(`
        SELECT priority, COUNT(*) as count 
        FROM tbl_monitoring_run_program 
        WHERE priority IS NOT NULL 
        GROUP BY priority 
        ORDER BY 
          CASE priority 
            WHEN 'HIGH' THEN 1 
            WHEN 'MEDIUM' THEN 2 
            WHEN 'LOW' THEN 3 
            ELSE 4 
          END
      `),
      getPool().query(`
        SELECT type, COUNT(*) as count 
        FROM tbl_monitoring_run_program 
        WHERE type IS NOT NULL 
        GROUP BY type 
        ORDER BY count DESC
      `),
      getPool().query(`
        SELECT bpo, COUNT(*) as count 
        FROM tbl_monitoring_run_program 
        WHERE bpo IS NOT NULL 
        GROUP BY bpo 
        ORDER BY count DESC 
        LIMIT 10
      `)
    ]);

    // Calculate average completion percentage
    const avgCompletionResult = await getPool().query(`
      SELECT AVG(percent_complete) as avg_completion 
      FROM tbl_monitoring_run_program 
      WHERE percent_complete IS NOT NULL
    `);

    // Get revenue statistics
    const revenueResult = await getPool().query(`
      SELECT 
        SUM(potensi_revenue) as total_revenue,
        AVG(potensi_revenue) as avg_revenue,
        MAX(potensi_revenue) as max_revenue
      FROM tbl_monitoring_run_program 
      WHERE potensi_revenue IS NOT NULL
    `);

    return NextResponse.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        avgCompletion: parseFloat(avgCompletionResult.rows[0].avg_completion || 0).toFixed(1),
        totalRevenue: parseInt(revenueResult.rows[0].total_revenue || 0),
        avgRevenue: parseInt(revenueResult.rows[0].avg_revenue || 0),
        maxRevenue: parseInt(revenueResult.rows[0].max_revenue || 0),
        byStatus: statusResult.rows,
        byPriority: priorityResult.rows,
        byType: typeResult.rows,
        byBpo: bpoResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
