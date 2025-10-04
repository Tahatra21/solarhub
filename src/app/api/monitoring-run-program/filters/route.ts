import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get unique values for filters
    const [typeResult, bpoResult, priorityResult, statusResult] = await Promise.all([
      getPool().query('SELECT DISTINCT type FROM tbl_monitoring_run_program WHERE type IS NOT NULL ORDER BY type'),
      getPool().query('SELECT DISTINCT bpo FROM tbl_monitoring_run_program WHERE bpo IS NOT NULL ORDER BY bpo'),
      getPool().query('SELECT DISTINCT priority FROM tbl_monitoring_run_program WHERE priority IS NOT NULL ORDER BY priority'),
      getPool().query('SELECT DISTINCT overall_status FROM tbl_monitoring_run_program WHERE overall_status IS NOT NULL ORDER BY overall_status')
    ]);

    return NextResponse.json({
      success: true,
      data: {
        types: typeResult.rows.map(row => row.type),
        bpos: bpoResult.rows.map(row => row.bpo),
        priorities: priorityResult.rows.map(row => row.priority),
        statuses: statusResult.rows.map(row => row.overall_status)
      }
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
