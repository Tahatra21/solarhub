import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Starting Excel import...');
    
    // Use the existing Python script from data folder
    const { stdout, stderr } = await execAsync('cd /Users/jmaharyuda/Project/plcv2/data && python3 import_monitoring_run_program.py');
    
    if (stderr) {
      console.error('Python script error:', stderr);
      return NextResponse.json(
        { success: false, error: 'Failed to read Excel file: ' + stderr },
        { status: 500 }
      );
    }

    console.log('📊 Python script output:', stdout);

    // Clear existing data
    await getPool().query('DELETE FROM tbl_monitoring_run_program');

    // Insert new data
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
      )
    `;

    // Note: Data is already imported by Python script
    // No need to manually insert data here

    // Verify data
    const countResult = await getPool().query('SELECT COUNT(*) FROM tbl_monitoring_run_program');
    const count = countResult.rows[0].count;

    // Clean up is handled by Python script

    return NextResponse.json({
      success: true,
      message: 'Excel import completed successfully',
      data: {
        totalRecords: parseInt(count)
      }
    });

  } catch (error) {
    console.error('Error importing Excel data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import Excel data' },
      { status: 500 }
    );
  }
}
