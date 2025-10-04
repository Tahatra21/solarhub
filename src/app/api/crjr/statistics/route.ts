import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/database';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    client = await getDbClient();
    
    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT jenis) as jenis_count,
        COUNT(DISTINCT corp) as corp_count,
        COUNT(DISTINCT tahapan) as tahapan_count,
        COUNT(DISTINCT tahun) as tahun_count,
        AVG(january) as avg_january,
        AVG(february) as avg_february,
        AVG(march) as avg_march,
        AVG(april) as avg_april,
        AVG(may) as avg_may,
        AVG(june) as avg_june,
        AVG(july) as avg_july,
        AVG(august) as avg_august,
        AVG(september) as avg_september,
        AVG(october) as avg_october,
        AVG(november) as avg_november,
        AVG(december) as avg_december
      FROM tbl_crjr
    `;
    
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    // Get statistics by jenis
    const jenisStatsQuery = `
      SELECT 
        jenis,
        COUNT(*) as count,
        ROUND(AVG(january), 2) as avg_january,
        ROUND(AVG(february), 2) as avg_february,
        ROUND(AVG(march), 2) as avg_march,
        ROUND(AVG(april), 2) as avg_april,
        ROUND(AVG(may), 2) as avg_may,
        ROUND(AVG(june), 2) as avg_june,
        ROUND(AVG(july), 2) as avg_july,
        ROUND(AVG(august), 2) as avg_august,
        ROUND(AVG(september), 2) as avg_september,
        ROUND(AVG(october), 2) as avg_october,
        ROUND(AVG(november), 2) as avg_november,
        ROUND(AVG(december), 2) as avg_december
      FROM tbl_crjr
      GROUP BY jenis
      ORDER BY count DESC
    `;
    
    const jenisStatsResult = await client.query(jenisStatsQuery);
    
    // Get statistics by corp
    const corpStatsQuery = `
      SELECT 
        corp,
        COUNT(*) as count,
        ROUND(AVG(january), 2) as avg_january,
        ROUND(AVG(february), 2) as avg_february,
        ROUND(AVG(march), 2) as avg_march,
        ROUND(AVG(april), 2) as avg_april,
        ROUND(AVG(may), 2) as avg_may,
        ROUND(AVG(june), 2) as avg_june,
        ROUND(AVG(july), 2) as avg_july,
        ROUND(AVG(august), 2) as avg_august,
        ROUND(AVG(september), 2) as avg_september,
        ROUND(AVG(october), 2) as avg_october,
        ROUND(AVG(november), 2) as avg_november,
        ROUND(AVG(december), 2) as avg_december
      FROM tbl_crjr
      GROUP BY corp
      ORDER BY count DESC
    `;
    
    const corpStatsResult = await client.query(corpStatsQuery);
    
    // Get statistics by tahapan
    const tahapanStatsQuery = `
      SELECT 
        tahapan,
        COUNT(*) as count,
        ROUND(AVG(january), 2) as avg_january,
        ROUND(AVG(february), 2) as avg_february,
        ROUND(AVG(march), 2) as avg_march,
        ROUND(AVG(april), 2) as avg_april,
        ROUND(AVG(may), 2) as avg_may,
        ROUND(AVG(june), 2) as avg_june,
        ROUND(AVG(july), 2) as avg_july,
        ROUND(AVG(august), 2) as avg_august,
        ROUND(AVG(september), 2) as avg_september,
        ROUND(AVG(october), 2) as avg_october,
        ROUND(AVG(november), 2) as avg_november,
        ROUND(AVG(december), 2) as avg_december
      FROM tbl_crjr
      GROUP BY tahapan
      ORDER BY count DESC
    `;
    
    const tahapanStatsResult = await client.query(tahapanStatsQuery);
    
    // Get statistics by tahun
    const tahunStatsQuery = `
      SELECT 
        tahun,
        COUNT(*) as count,
        ROUND(AVG(january), 2) as avg_january,
        ROUND(AVG(february), 2) as avg_february,
        ROUND(AVG(march), 2) as avg_march,
        ROUND(AVG(april), 2) as avg_april,
        ROUND(AVG(may), 2) as avg_may,
        ROUND(AVG(june), 2) as avg_june,
        ROUND(AVG(july), 2) as avg_july,
        ROUND(AVG(august), 2) as avg_august,
        ROUND(AVG(september), 2) as avg_september,
        ROUND(AVG(october), 2) as avg_october,
        ROUND(AVG(november), 2) as avg_november,
        ROUND(AVG(december), 2) as avg_december
      FROM tbl_crjr
      GROUP BY tahun
      ORDER BY tahun DESC
    `;
    
    const tahunStatsResult = await client.query(tahunStatsQuery);
    
    // Get monthly SLA trends - simplified approach
    const monthlyTrendsQuery = `
      WITH monthly_data AS (
        SELECT 
          'January' as month,
          ROUND(AVG(january), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE january IS NOT NULL
        UNION ALL
        SELECT 
          'February' as month,
          ROUND(AVG(february), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE february IS NOT NULL
        UNION ALL
        SELECT 
          'March' as month,
          ROUND(AVG(march), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE march IS NOT NULL
        UNION ALL
        SELECT 
          'April' as month,
          ROUND(AVG(april), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE april IS NOT NULL
        UNION ALL
        SELECT 
          'May' as month,
          ROUND(AVG(may), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE may IS NOT NULL
        UNION ALL
        SELECT 
          'June' as month,
          ROUND(AVG(june), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE june IS NOT NULL
        UNION ALL
        SELECT 
          'July' as month,
          ROUND(AVG(july), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE july IS NOT NULL
        UNION ALL
        SELECT 
          'August' as month,
          ROUND(AVG(august), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE august IS NOT NULL
        UNION ALL
        SELECT 
          'September' as month,
          ROUND(AVG(september), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE september IS NOT NULL
        UNION ALL
        SELECT 
          'October' as month,
          ROUND(AVG(october), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE october IS NOT NULL
        UNION ALL
        SELECT 
          'November' as month,
          ROUND(AVG(november), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE november IS NOT NULL
        UNION ALL
        SELECT 
          'December' as month,
          ROUND(AVG(december), 2) as avg_sla,
          COUNT(*) as total_records
        FROM tbl_crjr WHERE december IS NOT NULL
      )
      SELECT * FROM monthly_data
      ORDER BY 
        CASE month
          WHEN 'January' THEN 1
          WHEN 'February' THEN 2
          WHEN 'March' THEN 3
          WHEN 'April' THEN 4
          WHEN 'May' THEN 5
          WHEN 'June' THEN 6
          WHEN 'July' THEN 7
          WHEN 'August' THEN 8
          WHEN 'September' THEN 9
          WHEN 'October' THEN 10
          WHEN 'November' THEN 11
          WHEN 'December' THEN 12
        END
    `;
    
    const monthlyTrendsResult = await client.query(monthlyTrendsQuery);
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRecords: parseInt(stats.total_records),
          jenisCount: parseInt(stats.jenis_count),
          corpCount: parseInt(stats.corp_count),
          tahapanCount: parseInt(stats.tahapan_count),
          tahunCount: parseInt(stats.tahun_count),
          monthlyAverages: {
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
          }
        },
        byJenis: jenisStatsResult.rows,
        byCorp: corpStatsResult.rows,
        byTahapan: tahapanStatsResult.rows,
        byTahun: tahunStatsResult.rows,
        monthlyTrends: monthlyTrendsResult.rows
      }
    });
    
  } catch (error) {
    console.error('Database error in GET CR/JR statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch CR/JR statistics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
