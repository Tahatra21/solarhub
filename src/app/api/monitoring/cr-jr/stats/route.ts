import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/database';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    client = await getDbClient();
    
    // Query untuk mendapatkan statistik CR/JR dari tabel tbl_crjr yang baru
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN jenis = 'CR' THEN 1 ELSE 0 END) as cr,
        SUM(CASE WHEN jenis = 'JR' THEN 1 ELSE 0 END) as jr,
        SUM(CASE WHEN jenis = 'SR' THEN 1 ELSE 0 END) as sr,
        SUM(CASE WHEN tahapan = 'SELESAI/DEPLOY' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN tahapan = 'DEVELOPMENT' OR tahapan = 'UAT' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN tahapan = 'REQUREMENT' THEN 1 ELSE 0 END) as planned,
        SUM(CASE WHEN tahapan = 'CANCEL' THEN 1 ELSE 0 END) as cancelled,
        AVG(COALESCE(january, 0)) as avg_january,
        AVG(COALESCE(february, 0)) as avg_february,
        AVG(COALESCE(march, 0)) as avg_march,
        AVG(COALESCE(april, 0)) as avg_april,
        AVG(COALESCE(may, 0)) as avg_may,
        AVG(COALESCE(june, 0)) as avg_june,
        AVG(COALESCE(july, 0)) as avg_july,
        AVG(COALESCE(august, 0)) as avg_august,
        AVG(COALESCE(september, 0)) as avg_september,
        AVG(COALESCE(october, 0)) as avg_october,
        AVG(COALESCE(november, 0)) as avg_november,
        AVG(COALESCE(december, 0)) as avg_december
      FROM tbl_crjr
    `;
    
    const result = await client.query(statsQuery);
    const stats = result.rows[0];
    
    // Query untuk data bulanan (6 bulan terakhir)
    const monthlyQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count,
        SUM(CASE WHEN jenis = 'CR' THEN 1 ELSE 0 END) as cr_count,
        SUM(CASE WHEN jenis = 'JR' THEN 1 ELSE 0 END) as jr_count,
        SUM(CASE WHEN jenis = 'SR' THEN 1 ELSE 0 END) as sr_count
      FROM tbl_crjr
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `;
    
    const monthlyResult = await client.query(monthlyQuery);
    
    // Format response sesuai dengan struktur tbl_crjr
    const response = {
      success: true,
      data: {
        total: parseInt(stats.total) || 0,
        cr: parseInt(stats.cr) || 0,
        jr: parseInt(stats.jr) || 0,
        sr: parseInt(stats.sr) || 0,
        completed: parseInt(stats.completed) || 0,
        in_progress: parseInt(stats.in_progress) || 0,
        planned: parseInt(stats.planned) || 0,
        cancelled: parseInt(stats.cancelled) || 0,
        monthly_averages: {
          january: parseFloat(stats.avg_january) || 0,
          february: parseFloat(stats.avg_february) || 0,
          march: parseFloat(stats.avg_march) || 0,
          april: parseFloat(stats.avg_april) || 0,
          may: parseFloat(stats.avg_may) || 0,
          june: parseFloat(stats.avg_june) || 0,
          july: parseFloat(stats.avg_july) || 0,
          august: parseFloat(stats.avg_august) || 0,
          september: parseFloat(stats.avg_september) || 0,
          october: parseFloat(stats.avg_october) || 0,
          november: parseFloat(stats.avg_november) || 0,
          december: parseFloat(stats.avg_december) || 0
        },
        monthly_data: monthlyResult.rows.map(row => ({
          month: row.month,
          total: parseInt(row.count),
          cr: parseInt(row.cr_count),
          jr: parseInt(row.jr_count),
          sr: parseInt(row.sr_count)
        }))
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching CRJR stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CRJR statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}