import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const bpo = searchParams.get('bpo') || '';
    const priority = searchParams.get('priority') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '';
    const queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (task_name ILIKE $${paramCount} OR bpo ILIKE $${paramCount} OR pic_team_cusol ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (type) {
      paramCount++;
      whereClause += ` AND type = $${paramCount}`;
      queryParams.push(type);
    }

    if (bpo) {
      paramCount++;
      whereClause += ` AND bpo = $${paramCount}`;
      queryParams.push(bpo);
    }

    if (priority) {
      paramCount++;
      whereClause += ` AND priority = $${paramCount}`;
      queryParams.push(priority);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND overall_status = $${paramCount}`;
      queryParams.push(status);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM tbl_monitoring_run_program WHERE 1=1 ${whereClause}`;
    const countResult = await getPool().query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT 
        id, no_task, task_name, type, bpo, holding_sh_ap, potensi_revenue,
        pic_team_cusol, priority, percent_complete, surat, tanggal_surat,
        perihal_surat, start_date, end_date, pic_icon,
        progress_agst_w1, next_action_agst_w1, status_agst_w1,
        progress_agst_w2, next_action_agst_w2, status_agst_w2,
        progress_agst_w3, next_action_agst_w3, status_agst_w3,
        progress_agst_w4, next_action_agst_w4, status_agst_w4,
        progress_sept_w1, next_action_sept_w1, status_sept_w1, target_sept_w1,
        progress_sept_w2, next_action_sept_w2, status_sept_w2, target_sept_w2,
        this_week_progress, target_next_week_progress, overall_status,
        created_at, updated_at
      FROM tbl_monitoring_run_program 
      WHERE 1=1 ${whereClause}
      ORDER BY no_task ASC, created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const result = await getPool().query(dataQuery, queryParams);

    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching monitoring run program data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const insertQuery = `
      INSERT INTO tbl_monitoring_run_program (
        no_task, task_name, type, bpo, holding_sh_ap, potensi_revenue,
        pic_team_cusol, priority, percent_complete, surat, tanggal_surat,
        perihal_surat, start_date, end_date, pic_icon,
        progress_agst_w1, next_action_agst_w1, status_agst_w1,
        progress_agst_w2, next_action_agst_w2, status_agst_w2,
        progress_agst_w3, next_action_agst_w3, status_agst_w3,
        progress_agst_w4, next_action_agst_w4, status_agst_w4,
        progress_sept_w1, next_action_sept_w1, status_sept_w1, target_sept_w1,
        progress_sept_w2, next_action_sept_w2, status_sept_w2, target_sept_w2,
        this_week_progress, target_next_week_progress, overall_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
        $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38
      ) RETURNING id
    `;

    const values = [
      body.no_task, body.task_name, body.type, body.bpo, body.holding_sh_ap, body.potensi_revenue,
      body.pic_team_cusol, body.priority, body.percent_complete, body.surat, body.tanggal_surat,
      body.perihal_surat, body.start_date, body.end_date, body.pic_icon,
      body.progress_agst_w1, body.next_action_agst_w1, body.status_agst_w1,
      body.progress_agst_w2, body.next_action_agst_w2, body.status_agst_w2,
      body.progress_agst_w3, body.next_action_agst_w3, body.status_agst_w3,
      body.progress_agst_w4, body.next_action_agst_w4, body.status_agst_w4,
      body.progress_sept_w1, body.next_action_sept_w1, body.status_sept_w1, body.target_sept_w1,
      body.progress_sept_w2, body.next_action_sept_w2, body.status_sept_w2, body.target_sept_w2,
      body.this_week_progress, body.target_next_week_progress, body.overall_status
    ];

    const result = await getPool().query(insertQuery, values);
    
    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id },
      message: 'Monitoring run program created successfully'
    });

  } catch (error) {
    console.error('Error creating monitoring run program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create monitoring run program' },
      { status: 500 }
    );
  }
}
