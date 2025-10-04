import { NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET() {
  try {
    const pool = getPool();
    
    // Query to get product count by segment
    const query = `
      SELECT 
        s.segmen,
        COUNT(p.id) as count
      FROM tbl_produk p
      LEFT JOIN tbl_segmen s ON p.id_segmen = s.id
      GROUP BY s.segmen
    `;
    
    const result = await pool.query(query);
    
    // Initialize segments with 0
    const segments = {
      pembangkitan: 0,
      transmisi: 0,
      distribusi: 0,
      korporat_pp: 0
    };
    
    // Map database results to segments based on actual data
    result.rows.forEach(row => {
      const segmentName = row.segmen?.toLowerCase() || '';
      const count = parseInt(row.count) || 0;
      
      // Map based on actual segment names in database
      if (segmentName.includes('pembangkit') || segmentName.includes('ep & pembangkit')) {
        segments.pembangkitan += count;
      } else if (segmentName.includes('transmisi')) {
        segments.transmisi += count;
      } else if (segmentName.includes('distribusi')) {
        segments.distribusi += count;
      } else if (segmentName.includes('korporat') || segmentName.includes('pelayanan pelanggan')) {
        segments.korporat_pp += count;
      }
    });
    
    return NextResponse.json({
      success: true,
      data: segments
    });
    
  } catch (error) {
    console.error('Error fetching product segments:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch product segments',
      data: {
        pembangkitan: 0,
        transmisi: 0,
        distribusi: 0,
        korporat_pp: 0
      }
    }, { status: 500 });
  }
}
