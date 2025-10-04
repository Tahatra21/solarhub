import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up monitoring run program...');
    
    // Create table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tbl_monitoring_run_program (
        id SERIAL PRIMARY KEY,
        no_task INTEGER,
        task_name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        bpo VARCHAR(100),
        holding_sh_ap VARCHAR(100),
        potensi_revenue BIGINT,
        pic_team_cusol VARCHAR(100),
        priority VARCHAR(20),
        percent_complete DECIMAL(5,2),
        surat VARCHAR(100),
        tanggal_surat DATE,
        perihal_surat TEXT,
        start_date DATE,
        end_date DATE,
        pic_icon TEXT,
        progress_agst_w1 TEXT,
        next_action_agst_w1 TEXT,
        status_agst_w1 VARCHAR(50),
        progress_agst_w2 TEXT,
        next_action_agst_w2 TEXT,
        status_agst_w2 VARCHAR(50),
        progress_agst_w3 TEXT,
        next_action_agst_w3 TEXT,
        status_agst_w3 VARCHAR(50),
        progress_agst_w4 TEXT,
        next_action_agst_w4 TEXT,
        status_agst_w4 VARCHAR(50),
        progress_sept_w1 TEXT,
        next_action_sept_w1 TEXT,
        status_sept_w1 VARCHAR(50),
        target_sept_w1 TEXT,
        progress_sept_w2 TEXT,
        next_action_sept_w2 TEXT,
        status_sept_w2 VARCHAR(50),
        target_sept_w2 TEXT,
        this_week_progress TEXT,
        target_next_week_progress TEXT,
        overall_status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await getPool().query(createTableQuery);
    console.log('✅ Table created successfully');

    // Insert sample data based on Excel analysis
    const sampleData = [
      {
        no_task: 1,
        task_name: "Implementasi ITSM PLN BAG",
        type: "Application",
        bpo: "PT BAg",
        holding_sh_ap: "SH/AP",
        potensi_revenue: 858526970,
        pic_team_cusol: "Hisyam",
        priority: "HIGH",
        percent_complete: 30,
        surat: "TBD",
        tanggal_surat: null,
        perihal_surat: "TBD",
        start_date: "2025-06-16",
        end_date: null,
        pic_icon: "Cusol Aplikasi, Sales Aplikasi, APL Korp 1, Lanap",
        progress_agst_w1: "Blueprint Confirmation",
        next_action_agst_w1: null,
        status_agst_w1: null,
        progress_agst_w2: "Blueprint Confirmation",
        next_action_agst_w2: null,
        status_agst_w2: null,
        progress_agst_w3: "Blueprint Confirmation\nDeveloping ITSM & SSO",
        next_action_agst_w3: "Pembahasan & Pengesahan Hasil Pendataan User Berlisensi",
        status_agst_w3: null,
        progress_agst_w4: "Blueprint Confirmation\n- Pembahasan & Pengesahan Hasil Pendataan User Berlisensi",
        next_action_agst_w4: "- Pengesahan Dokumen Pendataan User\n- Finalisasi dan sirkuler Blueprint",
        status_agst_w4: "Development",
        progress_sept_w1: "Blueprint Confirmation\nDevelopment",
        next_action_sept_w1: "-Development mencapai 65%\n'-Bluprint selesai di revisi",
        status_sept_w1: "AT RISK",
        target_sept_w1: "-Progress deveopment mencapai 60%\n'-Blueprint disetujui (sign)",
        progress_sept_w2: "Blueprint Confirmation\nDevelopment",
        next_action_sept_w2: "-Development mencapai 65%\n'-Bluprint selesai di revisi",
        status_sept_w2: "AT RISK",
        target_sept_w2: "-Development mencapai 65%\n'-Bluprint selesai di revisi",
        this_week_progress: "-Development mencapai 67%\n'-Proses signing Blueprint",
        target_next_week_progress: "-Development mencapai 70%\n'-Bluprint selesai signing (W3 Oktober)",
        overall_status: "ON TRACK"
      },
      {
        no_task: 2,
        task_name: "Implementasi SSO PLN BAG",
        type: "Application",
        bpo: "PT BAg",
        holding_sh_ap: "SH/AP",
        potensi_revenue: 2318724144,
        pic_team_cusol: "Hisyam",
        priority: "HIGH",
        percent_complete: 30,
        surat: "TBD",
        tanggal_surat: null,
        perihal_surat: "TBD",
        start_date: "2025-06-16",
        end_date: null,
        pic_icon: "Cusol Aplikasi, Sales Aplikasi, APL Korp 1, Lanap",
        progress_agst_w1: null,
        next_action_agst_w1: null,
        status_agst_w1: null,
        progress_agst_w2: null,
        next_action_agst_w2: null,
        status_agst_w2: null,
        progress_agst_w3: null,
        next_action_agst_w3: null,
        status_agst_w3: null,
        progress_agst_w4: null,
        next_action_agst_w4: null,
        status_agst_w4: null,
        progress_sept_w1: "Blueprint Confirmation\nDevelopment",
        next_action_sept_w1: "Development mencapai 55%\n'-'-Bluprint selesai di revisi",
        status_sept_w1: "AT RISK",
        target_sept_w1: "-Progress deveopment mencapai 55%\n'-Blueprint disetujui (sign)",
        progress_sept_w2: "Blueprint Confirmation\nDevelopment",
        next_action_sept_w2: "Development mencapai 55%\n'-'-Bluprint selesai di revisi",
        status_sept_w2: "AT RISK",
        target_sept_w2: "Development mencapai 55%\n'-'-Bluprint selesai di revisi",
        this_week_progress: "-'Development mencapai 75%\n'-Proses signing Blueprint",
        target_next_week_progress: "-'Development mencapai 78%\n-Bluprint selesai signing (W3 Oktober)",
        overall_status: "ON TRACK"
      },
      {
        no_task: 3,
        task_name: "Implementasi HRIS PLN Nusa Daya",
        type: "Application",
        bpo: "PLN Nusa Daya",
        holding_sh_ap: "SH/AP",
        potensi_revenue: 1787917731,
        pic_team_cusol: "Hisyam",
        priority: "LOW",
        percent_complete: 10,
        surat: "TBD",
        tanggal_surat: null,
        perihal_surat: "TBD",
        start_date: null,
        end_date: null,
        pic_icon: "Cusol Aplikasi, Sales Aplikasi, Lanap",
        progress_agst_w1: "Pembuatan Proposal Awal",
        next_action_agst_w1: "Paparan Proposal",
        status_agst_w1: "Perancangan Proposal dan Finalisasi",
        progress_agst_w2: "Pembuatan Proposal Awal",
        next_action_agst_w2: "Pengiriman Proposal",
        status_agst_w2: "Perancangan Proposal dan Finalisasi",
        progress_agst_w3: "Pengiriman Proposal Penawaran Harga ke ND",
        next_action_agst_w3: "Paparan Proposal",
        status_agst_w3: "Proposal Terkirim",
        progress_agst_w4: "Menunggu dan Follow Up ke ND terkait Penawaran yang sudah dikirim",
        next_action_agst_w4: "Pemaparan Detail terkait proposal",
        status_agst_w4: "Pengiriman Proposal",
        progress_sept_w1: "Menunggu dan Follow Up ke ND terkait Penawaran yang sudah dikirim",
        next_action_sept_w1: "Pemaparan Detail terkait proposal",
        status_sept_w1: "AT RISK",
        target_sept_w1: "Pemaparan detail terkait proposal",
        progress_sept_w2: "Menunggu dan Follow Up ke ND terkait Penawaran yang sudah dikirim",
        next_action_sept_w2: "Pemaparan Detail terkait proposal",
        status_sept_w2: "AT RISK",
        target_sept_w2: "Pemaparan Detail terkait proposal",
        this_week_progress: "1. Proposal Penawaran telah disampaikan\n2. Menunggu dan Follow Up ke ND atas Proposal",
        target_next_week_progress: "1. Pemaparan Detail terkait proposal\n2. Tindak Lanjut Keputusan ND",
        overall_status: "LAGGING"
      }
    ];

    // Clear existing data
    await getPool().query('DELETE FROM tbl_monitoring_run_program');

    // Insert sample data
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

    for (const data of sampleData) {
      const values = [
        data.no_task, data.task_name, data.type, data.bpo, data.holding_sh_ap, data.potensi_revenue,
        data.pic_team_cusol, data.priority, data.percent_complete, data.surat, data.tanggal_surat,
        data.perihal_surat, data.start_date, data.end_date, data.pic_icon,
        data.progress_agst_w1, data.next_action_agst_w1, data.status_agst_w1,
        data.progress_agst_w2, data.next_action_agst_w2, data.status_agst_w2,
        data.progress_agst_w3, data.next_action_agst_w3, data.status_agst_w3,
        data.progress_agst_w4, data.next_action_agst_w4, data.status_agst_w4,
        data.progress_sept_w1, data.next_action_sept_w1, data.status_sept_w1, data.target_sept_w1,
        data.progress_sept_w2, data.next_action_sept_w2, data.status_sept_w2, data.target_sept_w2,
        data.this_week_progress, data.target_next_week_progress, data.overall_status
      ];

      await getPool().query(insertQuery, values);
    }

    // Verify data
    const countResult = await getPool().query('SELECT COUNT(*) FROM tbl_monitoring_run_program');
    const count = countResult.rows[0].count;

    return NextResponse.json({
      success: true,
      message: 'Monitoring Run Program setup completed successfully',
      data: {
        tableCreated: true,
        sampleDataInserted: sampleData.length,
        totalRecords: parseInt(count)
      }
    });

  } catch (error) {
    console.error('Error setting up monitoring run program:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup monitoring run program' },
      { status: 500 }
    );
  }
}
