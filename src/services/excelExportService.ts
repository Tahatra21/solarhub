import { SecureExcelService } from './secureExcelService';
import { TimelineExportData } from '@/types/timeline.types';

export class ExcelExportService {
  static async generateTimelineWorkbook(data: TimelineExportData): Promise<Buffer> {
    // Convert complex data to simple format for SecureExcelService
    const excelData = data.products.map((product, index) => ({
      'No': index + 1,
      'ID Produk': product.id,
      'Nama Produk': product.name,
      'Kategori': product.kategori,
      'Segmen': product.segmen,
      'Stage': product.stage,
      'Tanggal Mulai': product.stage_start || '-',
      'Tanggal Akhir': product.stage_end || '-',
      'Tanggal Stage': product.stage_date || '-'
    }));

    return await SecureExcelService.createWorkbook(excelData, {
      sheetName: 'Timeline Export',
      headers: ['No', 'ID Produk', 'Nama Produk', 'Kategori', 'Segmen', 'Stage', 'Tanggal Mulai', 'Tanggal Akhir', 'Tanggal Stage'],
      filename: `Timeline_Export_${new Date().toISOString().split('T')[0]}.xlsx`
    });
  }
}
