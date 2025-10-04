import { NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET() {
  const pool = getPool();
  
  try {
    // Get total count
    const totalQuery = 'SELECT COUNT(*) as total FROM tbl_crjr';
    const totalResult = await pool.query(totalQuery);
    const total = parseInt(totalResult.rows[0].total);

    // Get count by jenis
    const jenisQuery = `
      SELECT jenis, COUNT(*) as count 
      FROM tbl_crjr 
      WHERE jenis IS NOT NULL 
      GROUP BY jenis 
      ORDER BY count DESC
    `;
    const jenisResult = await pool.query(jenisQuery);

    // Get count by tahapan
    const tahapanQuery = `
      SELECT tahapan, COUNT(*) as count 
      FROM tbl_crjr 
      WHERE tahapan IS NOT NULL 
      GROUP BY tahapan 
      ORDER BY count DESC
    `;
    const tahapanResult = await pool.query(tahapanQuery);

    // Get count by year
    const yearQuery = `
      SELECT tahun, COUNT(*) as count 
      FROM tbl_crjr 
      WHERE tahun IS NOT NULL 
      GROUP BY tahun 
      ORDER BY tahun DESC
    `;
    const yearResult = await pool.query(yearQuery);

    return NextResponse.json({
      success: true,
      data: {
        total,
        byJenis: jenisResult.rows.map(row => ({
          jenis: row.jenis,
          count: parseInt(row.count)
        })),
        byTahapan: tahapanResult.rows.map(row => ({
          tahapan: row.tahapan,
          count: parseInt(row.count)
        })),
        byYear: yearResult.rows.map(row => ({
          tahun: parseInt(row.tahun),
          count: parseInt(row.count)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching CR/JR statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch CR/JR statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
