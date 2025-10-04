import { NextResponse } from "next/server";
import { getPool } from '@/lib/database';

export async function GET() {
  let client;
  try {
    client = await getPool().connect();
    // Query gabungan untuk menghitung produk berdasarkan stage dan total
    const statsQuery = `
        WITH stage_counts AS (
            SELECT 
                st.id,
                st.stage,
                st.icon_light,
                st.icon_dark,
                COUNT(p.id) as count
            FROM public.tbl_stage st
            LEFT JOIN public.tbl_produk p ON st.id = p.id_stage
            GROUP BY st.id, st.stage, st.icon_light, st.icon_dark
        ),
        total_count AS (
            SELECT COUNT(*) as total FROM public.tbl_produk
        )
        SELECT 
            sc.*,
            tc.total
        FROM stage_counts sc
        CROSS JOIN total_count tc
        ORDER BY sc.id
    `;

    const result = await client.query(statsQuery);
    
    // Inisialisasi stats dengan nilai default 0
    const stats = {
      introduction: 0,
      growth: 0,
      maturity: 0,
      decline: 0,
      total: result.rows.length > 0 ? parseInt(result.rows[0].total, 10) : 0
    };

    // Inisialisasi stages data untuk ikon
    const stages: Array<{
      id: string;
      stage: string;
      icon_light: string;
      icon_dark: string;
      count: number;
    }> = [];

    // Mapping hasil query ke stats object dan stages array
    result.rows.forEach(row => {
      const stageName = row.stage.toLowerCase();
      if (stats.hasOwnProperty(stageName)) {
        stats[stageName as keyof typeof stats] = parseInt(row.count, 10);
      }
      
      // Tambahkan data stage untuk ikon
      stages.push({
        id: row.id,
        stage: row.stage,
        icon_light: row.icon_light,
        icon_dark: row.icon_dark,
        count: parseInt(row.count, 10)
      });
    });

    const response = NextResponse.json({
      success: true,
      data: {
        stats,
        stages
      }
    });

    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
    response.headers.set('CDN-Cache-Control', 'public, max-age=120');
    
    return response;

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch dashboard statistics",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error("Error releasing client:", releaseError);
      }
    }
  }
}