import { NextResponse } from 'next/server';
import { TimelineService } from '@/services/timelineService';
import { ExcelExportService } from '@/services/excelExportService';

export async function GET() {
  try {
    const timelineData = await TimelineService.getTimelineData();
    const buffer = ExcelExportService.generateTimelineWorkbook(timelineData);
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="Timeline_Siklus_Hidup_${new Date().toISOString().split('T')[0]}.xlsx"`);
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const arrayBuffer = (buffer as unknown as { buffer: ArrayBuffer; byteOffset: number; byteLength: number }).buffer
      .slice(
        (buffer as unknown as { byteOffset: number }).byteOffset || 0,
        ((buffer as unknown as { byteOffset: number }).byteOffset || 0) + (buffer as unknown as { byteLength: number }).byteLength
      );
    
    return new NextResponse(arrayBuffer as unknown as BodyInit, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error exporting timeline to Excel:', error);
    return NextResponse.json(
      { error: 'Failed to export timeline data' },
      { status: 500 }
    );
  }
}