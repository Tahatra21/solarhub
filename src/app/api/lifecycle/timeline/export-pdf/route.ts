import { NextResponse } from 'next/server';
import { TimelineService } from '@/services/timelineService';
import { PDFExportService } from '@/services/pdfExportService';

export async function GET() {
  try {
    const timelineData = await TimelineService.getTimelineData();
    const buffer = await PDFExportService.generateTimelinePDF(timelineData);
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="Timeline_Siklus_Hidup_${new Date().toISOString().split('T')[0]}.pdf"`);
    headers.set('Content-Type', 'application/pdf');

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
    console.error('Error exporting timeline to PDF:', error);
    return NextResponse.json(
      { error: 'Failed to export timeline PDF' },
      { status: 500 }
    );
  }
}