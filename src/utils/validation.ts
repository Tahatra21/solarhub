import { z } from 'zod';

/**
 * Input validation schemas untuk keamanan
 */
export const userSchema = z.object({
  username: z.string()
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  
  fullname: z.string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter')
    .regex(/^[a-zA-Z\s]+$/, 'Nama hanya boleh huruf dan spasi'),
  
  email: z.string()
    .email('Format email tidak valid')
    .max(100, 'Email maksimal 100 karakter'),
  
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password maksimal 100 karakter')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
          'Password harus mengandung huruf kecil, huruf besar, angka, dan simbol'),
  
  role: z.number().int().positive('Role harus berupa angka positif'),
  jabatan: z.number().int().positive('Jabatan harus berupa angka positif')
});

export const productSchema = z.object({
  nama_produk: z.string()
    .min(2, 'Nama produk minimal 2 karakter')
    .max(200, 'Nama produk maksimal 200 karakter'),
  
  deskripsi: z.string()
    .max(1000, 'Deskripsi maksimal 1000 karakter')
    .optional(),
  
  id_kategori: z.number().int().positive('Kategori harus berupa angka positif'),
  id_segmen: z.number().int().positive('Segmen harus berupa angka positif'),
  id_stage: z.number().int().positive('Stage harus berupa angka positif'),
  
  harga: z.number().min(0, 'Harga tidak boleh negatif'),
  tanggal_launch: z.string().datetime('Format tanggal tidak valid'),
  customer: z.string().max(200, 'Nama customer maksimal 200 karakter')
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username harus diisi'),
  password: z.string().min(1, 'Password harus diisi')
});

/**
 * Sanitize input untuk mencegah XSS dan injection
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate file upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Size validation
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  // Type validation
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel', 'text/csv'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Name validation
  const dangerousPatterns = [
    /\.\./, /[<>:"|?*]/, /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      return { valid: false, error: 'Invalid file name' };
    }
  }

  return { valid: true };
}

/**
 * Validate SQL input untuk mencegah injection
 */
export function validateSqlInput(input: string): string {
  return input
    .replace(/[';-]/g, '') // Remove SQL injection patterns
    .replace(/union\s+select/gi, '')
    .replace(/drop\s+table/gi, '')
    .replace(/delete\s+from/gi, '')
    .replace(/insert\s+into/gi, '')
    .replace(/update\s+set/gi, '')
    .trim();
}
