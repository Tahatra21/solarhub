# 🧪 PANDUAN TESTING ROLE MANAGEMENT CRUD

## 🔍 **CARA MELAKUKAN TESTING:**

### **1. 🔐 Login sebagai Admin**
```
Username: admin
Password: admin123
```

### **2. 🧭 Akses Role Management**
- Klik menu **"Administrator"**
- Klik sub-menu **"Role Management"**
- URL: `http://localhost:3000/admin/roles`

### **3. 📋 Testing CRUD Operations**

#### **✅ CREATE (Tambah Role Baru):**
1. Klik tombol **"Add New Role"** atau **"+"**
2. Isi form:
   - **Role Name:** `Manager`
   - **Description:** `Role untuk manager`
3. Klik **"Save"** atau **"Submit"**
4. **Expected Result:** Role baru muncul di tabel

#### **✅ READ (Lihat Data):**
1. Pastikan tabel menampilkan semua roles
2. Cek pagination berfungsi
3. Test search functionality
4. **Expected Result:** Data tampil dengan benar

#### **✅ UPDATE (Edit Role):**
1. Klik tombol **"Edit"** pada role yang ingin diubah
2. Ubah data di form:
   - **Role Name:** `Senior Manager`
3. Klik **"Save"** atau **"Update"**
4. **Expected Result:** Data terupdate di tabel

#### **✅ DELETE (Hapus Role):**
1. Klik tombol **"Delete"** pada role yang ingin dihapus
2. Konfirmasi penghapusan
3. **Expected Result:** Role hilang dari tabel

---

## 🚨 **TROUBLESHOOTING:**

### **❌ Jika CRUD tidak bekerja:**

#### **1. Cek Browser Console:**
- Buka Developer Tools (F12)
- Lihat tab **Console**
- Cari error messages

#### **2. Cek Network Tab:**
- Buka tab **Network** di Developer Tools
- Lakukan operasi CRUD
- Lihat apakah API calls berhasil (status 200) atau gagal (status 400/500)

#### **3. Cek Authentication:**
- Pastikan sudah login sebagai admin
- Cek apakah token masih valid
- Logout dan login ulang jika perlu

#### **4. Cek Database Connection:**
- Pastikan aplikasi terhubung ke database
- Cek apakah tabel `tbl_role` ada dan accessible

---

## 🔧 **QUICK FIXES:**

### **Jika ada error "Cycle is not defined":**
```bash
# Clear cache dan restart
rm -rf .next
npm run dev
```

### **Jika API tidak merespons:**
```bash
# Restart aplikasi
pkill -f "next dev"
npm run dev
```

### **Jika database error:**
- Cek file `.env.local`
- Pastikan `DATABASE_URL` benar
- Test koneksi database

---

## 📊 **TESTING CHECKLIST:**

### **✅ Authentication:**
- [ ] Login sebagai admin berhasil
- [ ] Token authentication bekerja
- [ ] Session tidak expired

### **✅ Navigation:**
- [ ] Menu Administrator terlihat
- [ ] Sub-menu Role Management accessible
- [ ] URL routing benar

### **✅ CRUD Operations:**
- [ ] CREATE: Tambah role baru
- [ ] READ: Lihat daftar roles
- [ ] UPDATE: Edit role existing
- [ ] DELETE: Hapus role

### **✅ UI/UX:**
- [ ] Form validation bekerja
- [ ] Error messages muncul
- [ ] Success notifications tampil
- [ ] Loading states terlihat

### **✅ API Integration:**
- [ ] GET `/api/roles/master` - List roles
- [ ] POST `/api/roles` - Create role
- [ ] PUT `/api/roles/[id]` - Update role
- [ ] DELETE `/api/roles/[id]` - Delete role

---

## 🎯 **EXPECTED RESULTS:**

### **✅ Success Indicators:**
- Form submit tanpa error
- Data muncul di tabel
- Pagination bekerja
- Search functionality aktif
- CRUD operations smooth

### **❌ Failure Indicators:**
- Console errors
- Network request failures
- Form tidak submit
- Data tidak update
- Loading infinite

---

## 📞 **REPORTING ISSUES:**

Jika masih ada masalah, berikan informasi:
1. **Error message** dari console
2. **Network status** dari Developer Tools
3. **Steps to reproduce** masalah
4. **Expected vs Actual** behavior
5. **Browser** dan **version** yang digunakan

**Dengan panduan ini, Anda bisa melakukan testing Role Management CRUD secara sistematis!** 🚀
