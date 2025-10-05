import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

// Simple in-memory cache to reduce database calls
let notificationCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export async function GET(request: NextRequest) {
  // Check cache first
  const now = Date.now();
  if (notificationCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      data: notificationCache,
      message: 'Notifications retrieved from cache',
      cached: true
    });
  }

  let pool;
  try {
    pool = getPool();
    
    // Query dengan penanganan error yang lebih robust dan filter 30 hari
    const query = `
      SELECT 
        l.id as license_id,
        l.nama as nama_aplikasi,
        l.bpo,
        l.jenis as jenis_lisensi,
        l.end_date as akhir_layanan,
        l.created_at,
        CASE 
          WHEN l.end_date IS NULL OR l.end_date = '' OR l.end_date = '99/99/9999' THEN 999
          WHEN l.end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
            CASE 
              WHEN l.end_date::date - CURRENT_DATE <= 0 THEN 0
              ELSE l.end_date::date - CURRENT_DATE
            END
          ELSE 999
        END as days_until_expiry
      FROM tbl_mon_licenses l
      WHERE l.end_date IS NOT NULL 
      AND l.end_date != ''
      AND l.end_date != '99/99/9999'
      AND l.end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND l.nama IS NOT NULL
      AND l.nama != ''
      AND l.bpo IS NOT NULL
      AND l.bpo != ''
      AND l.jenis IS NOT NULL
      AND l.jenis != ''
      -- Filter: hanya tampilkan notifikasi yang expire dalam 30 hari ke depan (tidak termasuk yang sudah lewat)
      AND (
        CASE 
          WHEN l.end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN l.end_date::date - CURRENT_DATE
          ELSE 999
        END
      ) BETWEEN 0 AND 30
      ORDER BY 
        CASE 
          WHEN l.end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN l.end_date::date
          ELSE '2099-12-31'::date
        END ASC
      LIMIT 20
    `;

    const result = await pool.query(query);
    
    // Format data untuk notification bell
    const notifications = result.rows.map((row, index) => ({
      notification_id: index + 1,
      license_id: row.license_id || 0,
      notification_date: new Date().toISOString(),
      is_read: false,
      created_at: row.created_at || new Date().toISOString(),
      nama_aplikasi: row.nama_aplikasi || 'Unknown Application',
      bpo: row.bpo || 'Unknown BPO',
      akhir_layanan: row.akhir_layanan || 'N/A',
      jenis_lisensi: row.jenis_lisensi || 'Unknown Type',
      days_until_expiry: typeof row.days_until_expiry === 'number' ? row.days_until_expiry : 999
    }));

    // Update cache
    notificationCache = notifications;
    cacheTimestamp = now;

    return NextResponse.json({
      success: true,
      data: notifications,
      message: 'Notifications retrieved successfully',
      cached: false
    });

  } catch (error) {
    console.error('Error fetching license notifications:', error);
    
    // Return empty notifications instead of error to prevent UI issues
    // This prevents webpack runtime errors and keeps the UI functional
    return NextResponse.json({
      success: true,
      data: [],
      message: 'No notifications available',
      error: error instanceof Error ? error.message : 'Database query failed'
    });
  } finally {
    // Ensure proper cleanup
    if (pool) {
      // Connection pooling should handle cleanup automatically
    }
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_id } = body;

    if (!notification_id) {
      return NextResponse.json(
        { success: false, message: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Untuk sekarang, kita hanya return success karena ini adalah notifikasi real-time
    // Di implementasi yang lebih kompleks, kita bisa menyimpan status read di database
    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to mark notification as read',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const clearAll = url.searchParams.get('clear_all');
    
    if (clearAll === 'true') {
      // Clear all notifications - menggunakan localStorage di frontend untuk persistence
      console.log('All notifications cleared');
      
      // Clear cache when notifications are cleared
      notificationCache = null;
      cacheTimestamp = 0;
      
      return NextResponse.json({
        success: true,
        message: 'All notifications cleared successfully'
      });
    }

    // Jika tidak ada parameter clear_all=true, return error
    return NextResponse.json(
      { success: false, message: 'Use ?clear_all=true to clear all notifications' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to clear notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
