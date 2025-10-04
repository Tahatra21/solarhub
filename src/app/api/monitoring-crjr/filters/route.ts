import { NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET() {
  const pool = getPool();
  
  try {
    // Get distinct values for filters
    const queries = [
      'SELECT DISTINCT jenis FROM tbl_crjr WHERE jenis IS NOT NULL ORDER BY jenis',
      'SELECT DISTINCT corp FROM tbl_crjr WHERE corp IS NOT NULL ORDER BY corp',
      'SELECT DISTINCT tahapan FROM tbl_crjr WHERE tahapan IS NOT NULL ORDER BY tahapan',
      'SELECT DISTINCT organisasi FROM tbl_crjr WHERE organisasi IS NOT NULL ORDER BY organisasi'
    ];

    const [jenisResult, corpResult, tahapanResult, organisasiResult] = await Promise.all(
      queries.map(query => pool.query(query))
    );

    return NextResponse.json({
      success: true,
      data: {
        jenis: jenisResult.rows.map(row => row.jenis),
        corp: corpResult.rows.map(row => row.corp),
        tahapan: tahapanResult.rows.map(row => row.tahapan),
        organisasi: organisasiResult.rows.map(row => row.organisasi)
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
