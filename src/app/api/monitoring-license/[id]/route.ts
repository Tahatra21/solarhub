import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pool = getPool();
  
  try {
    const id = parseInt((await params).id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const query = 'SELECT * FROM tbl_mon_licenses WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'License not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching license:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch license',
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
    const id = parseInt((await params).id);
    const body = await request.json();
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const updateQuery = `
      UPDATE tbl_mon_licenses SET
        nama = $1, comp = $2, bpo = $3, jenis = $4, period = $5, qty = $6,
        symbol = $7, unit_price = $8, total_price = $9, selling_price = $10,
        cont_serv_month = $11, cont_period = $12, start_date = $13, end_date = $14,
        met_puch = $15, updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `;

    const values = [
      body.nama,
      body.comp,
      body.bpo,
      body.jenis,
      body.period,
      parseInt(body.qty),
      body.symbol || 'Rp',
      parseFloat(body.unit_price),
      parseFloat(body.total_price) || (parseInt(body.qty) * parseFloat(body.unit_price)),
      parseFloat(body.selling_price) || 0,
      parseInt(body.cont_serv_month) || 0,
      body.cont_period || '',
      body.start_date || null,
      body.end_date || null,
      body.met_puch || '',
      id
    ];

    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'License not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'License updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating license:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update license',
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
    const id = parseInt((await params).id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const deleteQuery = 'DELETE FROM tbl_mon_licenses WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'License not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'License deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting license:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete license',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
