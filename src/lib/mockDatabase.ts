// Mock database untuk development ketika PostgreSQL tidak tersedia
export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
    fullname: 'Administrator',
    email: 'admin@example.com',
    photo: null,
    role: 'Admin',
    jabatan: 'Administrator'
  },
  {
    id: 2,
    username: 'user',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
    fullname: 'Regular User',
    email: 'user@example.com',
    photo: null,
    role: 'User',
    jabatan: 'Staff'
  }
];

export function findUserByUsername(username: string) {
  return mockUsers.find(user => user.username === username);
}

export const mockProducts = [
  {
    id: 1,
    nama_produk: 'Sample Product 1',
    deskripsi: 'This is a sample product',
    id_stage: 1,
    stage: 'Introduction',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    nama_produk: 'Sample Product 2',
    deskripsi: 'Another sample product',
    id_stage: 2,
    stage: 'Growth',
    created_at: new Date().toISOString()
  }
];

export const mockLicenses = [
  {
    id: 1,
    nama_aplikasi: 'Microsoft Office',
    bpo: 'IT Department',
    jenis_lisensi: 'Enterprise',
    jumlah: 100,
    status: 'Active',
    akhir_layanan: '2025-12-31'
  },
  {
    id: 2,
    nama_aplikasi: 'Adobe Creative Suite',
    bpo: 'Design Team',
    jenis_lisensi: 'Professional',
    jumlah: 10,
    status: 'Active',
    akhir_layanan: '2025-06-30'
  }
];