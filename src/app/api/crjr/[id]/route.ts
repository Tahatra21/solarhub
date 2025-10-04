import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/database';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let client;
  
  try {
    client = await getDbClient();
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const query = `
      SELECT 
        id, no, jenis, corp, sub_bidang, nama_aplikasi, judul_change_request,
        nomor_surat_penugasan, manager_pic, tanggal_surat_sti, tahapan,
        organisasi, tahun, january, february, march, april, may, june,
        july, august, september, october, november, december,
        created_at, updated_at
      FROM tbl_crjr 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'CR/JR not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Database error in GET CR/JR by ID:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch CR/JR', 
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

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let client;
  
  try {
    client = await getDbClient();
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const {
      no,
      jenis,
      corp,
      sub_bidang,
      nama_aplikasi,
      judul_change_request,
      nomor_surat_penugasan,
      manager_pic,
      tanggal_surat_sti,
      tahapan,
      organisasi,
      tahun,
      january,
      february,
      march,
      april,
      may,
      june,
      july,
      august,
      september,
      october,
      november,
      december
    } = body;
    
    // Validate required fields
    if (!jenis) {
      return NextResponse.json(
        { error: 'Missing required field: jenis' },
        { status: 400 }
      );
    }
    
    const query = `
      UPDATE tbl_crjr SET
        no = $1,
        jenis = $2,
        corp = $3,
        sub_bidang = $4,
        nama_aplikasi = $5,
        judul_change_request = $6,
        nomor_surat_penugasan = $7,
        manager_pic = $8,
        tanggal_surat_sti = $9,
        tahapan = $10,
        organisasi = $11,
        tahun = $12,
        january = $13,
        february = $14,
        march = $15,
        april = $16,
        may = $17,
        june = $18,
        july = $19,
        august = $20,
        september = $21,
        october = $22,
        november = $23,
        december = $24,
        updated_at = NOW()
      WHERE id = $25
      RETURNING *
    `;
    
    const values = [
      no || null,
      jenis,
      corp || null,
      sub_bidang || null,
      nama_aplikasi || null,
      judul_change_request || null,
      nomor_surat_penugasan || null,
      manager_pic || null,
      tanggal_surat_sti || null,
      tahapan || null,
      organisasi || null,
      tahun || null,
      january || null,
      february || null,
      march || null,
      april || null,
      may || null,
      june || null,
      july || null,
      august || null,
      september || null,
      october || null,
      november || null,
      december || null,
      id
    ];
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'CR/JR not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'CR/JR updated successfully'
    });
    
  } catch (error) {
    console.error('Database error in PUT CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update CR/JR', 
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let client;
  
  try {
    client = await getDbClient();
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const query = `
      DELETE FROM tbl_crjr 
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'CR/JR not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'CR/JR deleted successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Database error in DELETE CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete CR/JR', 
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
