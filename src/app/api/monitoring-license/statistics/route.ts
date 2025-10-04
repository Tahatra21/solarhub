import { NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET() {
  const pool = getPool();
  
  try {
    // Get total count
    const totalQuery = 'SELECT COUNT(*) as total FROM tbl_mon_licenses';
    const totalResult = await pool.query(totalQuery);
    const total = parseInt(totalResult.rows[0].total);

    // Calculate status based on end_date
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Get active licenses (end_date > today) - handle invalid dates
    const activeQuery = `
      SELECT COUNT(*) as count 
      FROM tbl_mon_licenses 
      WHERE end_date IS NOT NULL 
      AND end_date != '99/99/9999'
      AND end_date != ''
      AND LENGTH(end_date) >= 8
      AND end_date > CURRENT_DATE::text
    `;
    const activeResult = await pool.query(activeQuery);
    const active = parseInt(activeResult.rows[0].count);

    // Get expiring licenses (end_date between today and 30 days from now)
    const expiringQuery = `
      SELECT COUNT(*) as count 
      FROM tbl_mon_licenses 
      WHERE end_date IS NOT NULL 
      AND end_date != '99/99/9999'
      AND end_date != ''
      AND LENGTH(end_date) >= 8
      AND end_date > CURRENT_DATE::text
      AND end_date <= (CURRENT_DATE + INTERVAL '30 days')::text
    `;
    const expiringResult = await pool.query(expiringQuery);
    const expiring = parseInt(expiringResult.rows[0].count);

    // Get expired licenses (end_date < today)
    const expiredQuery = `
      SELECT COUNT(*) as count 
      FROM tbl_mon_licenses 
      WHERE end_date IS NOT NULL 
      AND end_date != '99/99/9999'
      AND end_date != ''
      AND LENGTH(end_date) >= 8
      AND end_date < CURRENT_DATE::text
    `;
    const expiredResult = await pool.query(expiredQuery);
    const expired = parseInt(expiredResult.rows[0].count);

    // Get total value
    const valueQuery = 'SELECT SUM(CAST(total_price AS BIGINT)) as total_value FROM tbl_mon_licenses';
    const valueResult = await pool.query(valueQuery);
    const totalValue = parseInt(valueResult.rows[0].total_value) || 0;

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        expiring,
        expired,
        totalValue
      }
    });

  } catch (error) {
    console.error('Error fetching license statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch license statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
