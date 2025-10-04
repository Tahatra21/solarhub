import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/database';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    client = await getDbClient();
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    
    // Sorting parameters
    const sortBy = searchParams.get("sortBy") || "id";
    const sortOrder = searchParams.get("sortOrder")?.toUpperCase() === "DESC" ? "DESC" : "ASC";
    
    // Filter parameters
    const search = searchParams.get("search")?.trim() || "";
    const jenis = searchParams.get("jenis") || "";
    const corp = searchParams.get("corp") || "";
    const tahapan = searchParams.get("tahapan") || "";
    const tahun = searchParams.get("tahun") || "";
    
    // Valid sort fields
    const validSortFields = [
      "id", "no", "jenis", "corp", "sub_bidang", "nama_aplikasi", 
      "tanggal_surat_sti", "tahapan", "organisasi", "tahun", "created_at"
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "id";
    
    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      whereConditions.push(`(
        LOWER(no) LIKE $${paramCount} OR 
        LOWER(nama_aplikasi) LIKE $${paramCount} OR 
        LOWER(judul_change_request) LIKE $${paramCount} OR 
        LOWER(nomor_surat_penugasan) LIKE $${paramCount} OR 
        LOWER(manager_pic) LIKE $${paramCount}
      )`);
      queryParams.push(`%${search.toLowerCase()}%`);
    }
    
    if (jenis) {
      paramCount++;
      whereConditions.push(`jenis = $${paramCount}`);
      queryParams.push(jenis);
    }
    
    if (corp) {
      paramCount++;
      whereConditions.push(`corp = $${paramCount}`);
      queryParams.push(corp);
    }
    
    if (tahapan) {
      paramCount++;
      whereConditions.push(`tahapan = $${paramCount}`);
      queryParams.push(tahapan);
    }
    
    if (tahun) {
      paramCount++;
      whereConditions.push(`tahun = $${paramCount}`);
      queryParams.push(parseInt(tahun));
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) FROM tbl_crjr ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Main data query
    const dataQuery = `
      SELECT 
        id, no, jenis, corp, sub_bidang, nama_aplikasi, judul_change_request,
        nomor_surat_penugasan, manager_pic, tanggal_surat_sti, tahapan,
        organisasi, tahun, january, february, march, april, may, june,
        july, august, september, october, november, december,
        created_at, updated_at
      FROM tbl_crjr 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    const result = await client.query(dataQuery, queryParams);
    
    // Get statistics
    const statsQuery = `
      SELECT 
        jenis,
        COUNT(*) as count,
        AVG(CASE 
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 1 THEN january
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 2 THEN february
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 3 THEN march
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 4 THEN april
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 5 THEN may
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 6 THEN june
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 7 THEN july
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 8 THEN august
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 9 THEN september
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 10 THEN october
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 11 THEN november
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 12 THEN december
        END) as avg_sla_current_month
      FROM tbl_crjr 
      ${whereClause}
      GROUP BY jenis
    `;
    
    const statsResult = await client.query(statsQuery, queryParams.slice(0, -2)); // Remove limit and offset
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statistics: statsResult.rows,
      filters: {
        search,
        jenis,
        corp,
        tahapan,
        tahun
      }
    });
    
  } catch (error) {
    console.error('Database error in GET CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch CR/JR data', 
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

export async function POST(request: NextRequest) {
  let client;
  
  try {
    client = await getDbClient();
    const body = await request.json();
    
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
      INSERT INTO tbl_crjr (
        no, jenis, corp, sub_bidang, nama_aplikasi, judul_change_request,
        nomor_surat_penugasan, manager_pic, tanggal_surat_sti, tahapan,
        organisasi, tahun, january, february, march, april, may, june,
        july, august, september, october, november, december,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW()
      )
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
      december || null
    ];
    
    const result = await client.query(query, values);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'CR/JR created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Database error in POST CR/JR:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create CR/JR', 
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
