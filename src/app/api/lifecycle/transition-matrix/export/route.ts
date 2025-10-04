import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';
import { SecureExcelService } from '@/services/secureExcelService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const selectedSegment = searchParams.get('segment') || 'Semua Segmen';
  const selectedStage = searchParams.get('stage') || 'Semua Tahap';

  const client = await getPool().connect();
  try {
    // Query untuk mendapatkan data stages
    const stagesQuery = `
      SELECT stage 
      FROM public.tbl_stage 
      ORDER BY 
        CASE stage 
          WHEN 'Introduction' THEN 1
          WHEN 'Growth' THEN 2
          WHEN 'Maturity' THEN 3
          WHEN 'Decline' THEN 4
          ELSE 5
        END
    `;
    
    // Query untuk mendapatkan data segments
    const segmentsQuery = `
      SELECT segmen 
      FROM public.tbl_segmen 
      ORDER BY segmen
    `;
    
    // Query untuk mendapatkan matrix data dengan filter
    let matrixQuery = `
      SELECT 
        st.stage,
        sg.segmen,
        COUNT(p.id) as count
      FROM public.tbl_stage st
      CROSS JOIN public.tbl_segmen sg
      LEFT JOIN public.tbl_produk p ON st.id = p.id_stage AND sg.id = p.id_segmen
    `;
    
    const queryParams: string[] = [];
    let paramIndex = 1;
    
    if (selectedSegment !== 'Semua Segmen') {
      matrixQuery += ` WHERE sg.segmen = $${paramIndex}`;
      queryParams.push(selectedSegment);
      paramIndex++;
    }
    
    if (selectedStage !== 'Semua Tahap') {
      matrixQuery += selectedSegment !== 'Semua Segmen' ? ' AND' : ' WHERE';
      matrixQuery += ` st.stage = $${paramIndex}`;
      queryParams.push(selectedStage);
    }
    
    matrixQuery += `
      GROUP BY st.id, st.stage, sg.id, sg.segmen
      ORDER BY 
        CASE st.stage 
          WHEN 'Introduction' THEN 1
          WHEN 'Growth' THEN 2
          WHEN 'Maturity' THEN 3
          WHEN 'Decline' THEN 4
          ELSE 5
        END,
        sg.segmen
    `;

    const [stagesResult, segmentsResult, matrixResult] = await Promise.all([
      client.query(stagesQuery),
      client.query(segmentsQuery),
      client.query(matrixQuery, queryParams)
    ]);
    
    let stages = stagesResult.rows.map(row => row.stage);
    let segments = segmentsResult.rows.map(row => row.segmen);
    
    // Filter stages dan segments jika ada filter
    if (selectedStage !== 'Semua Tahap') {
      stages = stages.filter(stage => stage === selectedStage);
    }
    if (selectedSegment !== 'Semua Segmen') {
      segments = segments.filter(segment => segment === selectedSegment);
    }
    
    // Membuat matrix data
    const matrixData: (string | number)[][] = [];
    
    // Header row
    const headerRow = ['Stage / Segment', ...segments];
    matrixData.push(headerRow);
    
    // Data rows
    stages.forEach((stage) => {
      const row: (string | number)[] = [stage];
      segments.forEach((segment) => {
        const matrixRow = matrixResult.rows.find(
          row => row.stage === stage && row.segmen === segment
        );
        row.push(matrixRow ? parseInt(matrixRow.count) : 0);
      });
      matrixData.push(row);
    });
    
    // Generate buffer menggunakan SecureExcelService
    const buffer = await SecureExcelService.createWorkbook(matrixData, {
      sheetName: 'Transition Matrix',
      filename: `Transition_Matrix_${selectedSegment}_${selectedStage}_${new Date().toISOString().split('T')[0]}.xlsx`
    });
    
    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `transition-matrix-${timestamp}.xlsx`;
    
    // Return response dengan security headers
    return SecureExcelService.createExcelResponse(buffer, filename);
    
  } catch (error) {
    console.error('Error exporting transition matrix:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export transition matrix' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}