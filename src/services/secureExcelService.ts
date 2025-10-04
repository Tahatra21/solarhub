import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

/**
 * Secure Excel service menggunakan ExcelJS sebagai alternatif yang lebih aman dari xlsx
 */
export class SecureExcelService {
  /**
   * Create Excel workbook dengan validasi input
   */
  static async createWorkbook(data: any[], options: {
    sheetName?: string;
    headers?: string[];
    filename?: string;
  } = {}): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(options.sheetName || 'Data');

      // Validate input data
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data format');
      }

      // Add headers
      if (options.headers && options.headers.length > 0) {
        worksheet.addRow(options.headers);
        
        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      }

      // Add data rows dengan sanitization
      data.forEach(row => {
        const sanitizedRow = this.sanitizeRowData(row);
        worksheet.addRow(sanitizedRow);
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = Math.min(column.width || 10, 50);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    } catch (error) {
      console.error('Excel creation error:', error);
      throw new Error('Failed to create Excel file');
    }
  }

  /**
   * Read Excel file dengan validasi keamanan
   */
  static async readExcel(buffer: Buffer, options: {
    sheetIndex?: number;
    maxRows?: number;
    maxColumns?: number;
  } = {}): Promise<any[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet(options.sheetIndex || 1);
      if (!worksheet) {
        throw new Error('Worksheet not found');
      }

      const maxRows = options.maxRows || 10000;
      const maxColumns = options.maxColumns || 100;
      
      const data: any[] = [];
      let rowCount = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowCount >= maxRows) {
          return false; // Stop iteration
        }

        const rowData: any[] = [];
        let colCount = 0;

        row.eachCell((cell, colNumber) => {
          if (colCount >= maxColumns) {
            return false; // Stop iteration
          }

          // Sanitize cell value
          const value = this.sanitizeCellValue(cell.value);
          rowData.push(value);
          colCount++;
        });

        data.push(rowData);
        rowCount++;
      });

      return data;

    } catch (error) {
      console.error('Excel reading error:', error);
      throw new Error('Failed to read Excel file');
    }
  }

  /**
   * Sanitize row data untuk mencegah injection
   */
  private static sanitizeRowData(row: any): any[] {
    if (Array.isArray(row)) {
      return row.map(cell => this.sanitizeCellValue(cell));
    }
    
    if (typeof row === 'object' && row !== null) {
      return Object.values(row).map(value => this.sanitizeCellValue(value));
    }
    
    return [this.sanitizeCellValue(row)];
  }

  /**
   * Sanitize cell value
   */
  private static sanitizeCellValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potentially dangerous content
      return value
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .substring(0, 1000); // Limit length
    }
    
    if (typeof value === 'number') {
      // Validate number range
      if (isNaN(value) || !isFinite(value)) {
        return 0;
      }
      return Math.max(-999999999, Math.min(999999999, value));
    }
    
    if (value instanceof Date) {
      return value;
    }
    
    return value;
  }

  /**
   * Validate Excel file sebelum processing
   */
  static validateExcelFile(file: File): { valid: boolean; error?: string } {
    // File size validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    // File type validation
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed. Only Excel and CSV files are supported' };
    }

    // File name validation
    const dangerousPatterns = [
      /\.\./, // Path traversal
      /[<>:"|?*]/, // Invalid characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Reserved names
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(file.name)) {
        return { valid: false, error: 'Invalid file name' };
      }
    }

    return { valid: true };
  }

  /**
   * Create Excel response dengan security headers
   */
  static createExcelResponse(buffer: Buffer, filename: string): NextResponse {
    const response = new NextResponse(buffer as any);
    
    // Security headers
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return response;
  }
}
