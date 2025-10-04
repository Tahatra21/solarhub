import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    const query = `
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
      WHERE id = $1
    `;

    const result = await getPool().query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Monitoring run program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching monitoring run program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitoring run program' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    
    const updateQuery = `
      UPDATE tbl_monitoring_run_program SET
        no_task = $2, task_name = $3, type = $4, bpo = $5, holding_sh_ap = $6, 
        potensi_revenue = $7, pic_team_cusol = $8, priority = $9, percent_complete = $10,
        surat = $11, tanggal_surat = $12, perihal_surat = $13, start_date = $14, 
        end_date = $15, pic_icon = $16,
        progress_agst_w1 = $17, next_action_agst_w1 = $18, status_agst_w1 = $19,
        progress_agst_w2 = $20, next_action_agst_w2 = $21, status_agst_w2 = $22,
        progress_agst_w3 = $23, next_action_agst_w3 = $24, status_agst_w3 = $25,
        progress_agst_w4 = $26, next_action_agst_w4 = $27, status_agst_w4 = $28,
        progress_sept_w1 = $29, next_action_sept_w1 = $30, status_sept_w1 = $31, 
        target_sept_w1 = $32,
        progress_sept_w2 = $33, next_action_sept_w2 = $34, status_sept_w2 = $35, 
        target_sept_w2 = $36,
        this_week_progress = $37, target_next_week_progress = $38, overall_status = $39,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const values = [
      id,
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

    const result = await getPool().query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Monitoring run program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id },
      message: 'Monitoring run program updated successfully'
    });

  } catch (error) {
    console.error('Error updating monitoring run program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update monitoring run program' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    const deleteQuery = 'DELETE FROM tbl_monitoring_run_program WHERE id = $1 RETURNING id';
    const result = await getPool().query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Monitoring run program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Monitoring run program deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting monitoring run program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete monitoring run program' },
      { status: 500 }
    );
  }
}
