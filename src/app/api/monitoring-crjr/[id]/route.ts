import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pool = getPool();
  
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const query = 'SELECT * FROM tbl_crjr WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CR/JR not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch CR/JR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pool = getPool();
  
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const updateQuery = `
      UPDATE tbl_crjr SET
        no = $1, jenis = $2, corp = $3, sub_bidang = $4, nama_aplikasi = $5,
        judul_change_request = $6, nomor_surat_penugasan = $7, manager_pic = $8,
        tanggal_surat_sti = $9, tahapan = $10, organisasi = $11, tahun = $12,
        january = $13, february = $14, march = $15, april = $16, may = $17, june = $18,
        july = $19, august = $20, september = $21, october = $22, november = $23, december = $24,
        updated_at = NOW()
      WHERE id = $25
      RETURNING *
    `;

    const values = [
      body.no || null,
      body.jenis,
      body.corp || null,
      body.sub_bidang || null,
      body.nama_aplikasi,
      body.judul_change_request,
      body.nomor_surat_penugasan || null,
      body.manager_pic || null,
      body.tanggal_surat_sti || null,
      body.tahapan || null,
      body.organisasi || null,
      body.tahun || new Date().getFullYear(),
      body.january || 0,
      body.february || 0,
      body.march || 0,
      body.april || 0,
      body.may || 0,
      body.june || 0,
      body.july || 0,
      body.august || 0,
      body.september || 0,
      body.october || 0,
      body.november || 0,
      body.december || 0,
      id
    ];

    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CR/JR not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'CR/JR updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update CR/JR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pool = getPool();
  
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const deleteQuery = 'DELETE FROM tbl_crjr WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CR/JR not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'CR/JR deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete CR/JR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
