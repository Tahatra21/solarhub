import { NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET() {
  const pool = getPool();
  
  try {
    // Get distinct values for filters
    const queries = [
      'SELECT DISTINCT jenis FROM tbl_mon_licenses WHERE jenis IS NOT NULL ORDER BY jenis',
      'SELECT DISTINCT comp FROM tbl_mon_licenses WHERE comp IS NOT NULL ORDER BY comp',
      'SELECT DISTINCT bpo FROM tbl_mon_licenses WHERE bpo IS NOT NULL ORDER BY bpo',
      'SELECT DISTINCT period FROM tbl_mon_licenses WHERE period IS NOT NULL ORDER BY period'
    ];

    const [jenisResult, compResult, bpoResult, periodResult] = await Promise.all(
      queries.map(query => pool.query(query))
    );

    return NextResponse.json({
      success: true,
      data: {
        jenis: jenisResult.rows.map(row => row.jenis),
        comp: compResult.rows.map(row => row.comp),
        bpo: bpoResult.rows.map(row => row.bpo),
        period: periodResult.rows.map(row => row.period)
      }
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch filter options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
