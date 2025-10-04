import { NextResponse } from "next/server";
import { getPool } from '@/lib/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "9");
  const offset = (page - 1) * limit;

  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder")?.toUpperCase() === "DESC" ? "DESC" : "ASC";
  const search = searchParams.get("search")?.trim() || "";
  const kategori = searchParams.get("kategori") || "";
  const segmen = searchParams.get("segmen") || "";
  const stage = searchParams.get("stage") || "";

  const validSortFields = ["id", "produk", "kategori", "segmen", "stage", "harga", "tanggal_launch", "created_at"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "created_at";

  const client = await getPool().connect();
  try {
    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (search && search.length > 0) {
      whereConditions.push(`(LOWER(p.produk) LIKE $${paramIndex} OR LOWER(p.deskripsi) LIKE $${paramIndex} OR LOWER(k.kategori) LIKE $${paramIndex} OR LOWER(s.segmen) LIKE $${paramIndex} OR LOWER(st.stage) LIKE $${paramIndex})`);
      queryParams.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    if (kategori) {
      whereConditions.push(`p.id_kategori = $${paramIndex}`);
      queryParams.push(parseInt(kategori));
      paramIndex++;
    }

    if (segmen) {
      whereConditions.push(`p.id_segmen = $${paramIndex}`);
      queryParams.push(parseInt(segmen));
      paramIndex++;
    }

    if (stage) {
      whereConditions.push(`p.id_stage = $${paramIndex}`);
      queryParams.push(parseInt(stage));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `
      SELECT COUNT(*) 
      FROM public.tbl_produk p
      LEFT JOIN public.tbl_kategori k ON p.id_kategori = k.id
      LEFT JOIN public.tbl_segmen s ON p.id_segmen = s.id
      LEFT JOIN public.tbl_stage st ON p.id_stage = st.id
      ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    // Get data with pagination
    const dataQuery = `
      SELECT 
        p.id, 
        p.produk as nama_produk, 
        p.deskripsi, 
        p.id_kategori, k.kategori,
        p.id_segmen, s.segmen,
        p.id_stage, st.stage,
        p.harga, p.tanggal_launch, 
        p.pelanggan as customer, 
        p.created_at, p.updated_at
      FROM public.tbl_produk p
      LEFT JOIN public.tbl_kategori k ON p.id_kategori = k.id
      LEFT JOIN public.tbl_segmen s ON p.id_segmen = s.id
      LEFT JOIN public.tbl_stage st ON p.id_stage = st.id
      ${whereClause}
      ORDER BY p.${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await client.query(dataQuery, queryParams);

    // Get attachments for all products in one query (N+1 query optimization)
    const products = result.rows;
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      const attachmentQuery = `
        SELECT 
          produk_id,
          id, 
          nama_attachment as nama_file, 
          url_attachment as path_file, 
          size as ukuran_file, 
          type, 
          created_at, 
          updated_at
        FROM public.tbl_attachment_produk
        WHERE produk_id = ANY($1)
        ORDER BY produk_id, created_at DESC
      `;
      const attachmentResult = await client.query(attachmentQuery, [productIds]);
      
      // Group attachments by product_id
      const attachmentsByProduct = attachmentResult.rows.reduce((acc, attachment) => {
        if (!acc[attachment.produk_id]) {
          acc[attachment.produk_id] = [];
        }
        acc[attachment.produk_id].push(attachment);
        return acc;
      }, {} as Record<number, any[]>);
      
      // Assign attachments to products
      products.forEach(product => {
        product.attachments = attachmentsByProduct[product.id] || [];
      });
    }

    // Create response with caching headers
    const response = NextResponse.json({
      success: true,
      data: products,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    response.headers.set('CDN-Cache-Control', 'public, max-age=300');
    
    return response;
  } catch (err) {
    console.error("Database Error:", err);
    return NextResponse.json({ 
      success: false,
      error: "Server Error", 
      message: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 });
  } finally {
    client.release();
  }
}