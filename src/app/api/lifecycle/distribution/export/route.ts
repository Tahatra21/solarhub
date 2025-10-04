import { NextResponse } from 'next/server';
import { SecureExcelService } from '@/services/secureExcelService';
import { getPool } from '@/lib/database';

export async function GET() {
  try {
    const query = `
      SELECT 
        p.id,
        p.produk as nama_produk,
        p.deskripsi,
        k.kategori as nama_kategori,
        s.stage as nama_stage,
        seg.segmen as nama_segmen,
        p.harga,
        p.created_at as tanggal_dibuat,
        p.updated_at as tanggal_diperbarui
      FROM tbl_produk p
      LEFT JOIN tbl_kategori k ON p.id_kategori = k.id
      LEFT JOIN tbl_stage s ON p.id_stage = s.id
      LEFT JOIN tbl_segmen seg ON p.id_segmen = seg.id
      ORDER BY p.created_at DESC
    `;

    const result = await getPool().query(query);
    const products = result.rows;

    // Format data untuk Excel
    const excelData = products.map((product, index) => ({
      'No': index + 1,
      'Nama Produk': product.nama_produk,
      'Deskripsi': product.deskripsi || '-',
      'Kategori': product.nama_kategori || '-',
      'Stage': product.nama_stage || '-',
      'Segmen': product.nama_segmen || '-',
      'Harga': product.harga ? `Rp ${product.harga.toLocaleString('id-ID')}` : '-',
      'Tanggal Dibuat': product.tanggal_dibuat ? new Date(product.tanggal_dibuat).toLocaleDateString('id-ID') : '-',
      'Tanggal Diperbarui': product.tanggal_diperbarui ? new Date(product.tanggal_diperbarui).toLocaleDateString('id-ID') : '-'
    }));

    // Buat workbook menggunakan SecureExcelService
    const buffer = await SecureExcelService.createWorkbook(excelData, {
      sheetName: 'Lifecycle Distribution',
      headers: ['No', 'Nama Produk', 'Deskripsi', 'Kategori', 'Stage', 'Segmen', 'Harga', 'Tanggal Dibuat', 'Tanggal Diperbarui'],
      filename: `Lifecycle_Distribution_${new Date().toISOString().split('T')[0]}.xlsx`
    });
    
    // Return response dengan security headers
    return SecureExcelService.createExcelResponse(buffer, `Lifecycle_Distribution_${new Date().toISOString().split('T')[0]}.xlsx`);

  } catch (error) {
    console.error('Error exporting lifecycle distribution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}