# 🧪 PANDUAN TESTING ROLE MANAGEMENT CRUD - MANUAL

## 🚀 **CARA TESTING YANG MUDAH:**

### **1. 🌐 Buka Browser**
- Buka `http://localhost:3000`
- Pastikan aplikasi running

### **2. 🔐 Login sebagai Admin**
```
Username: admin
Password: admin123
```

### **3. 🧭 Navigasi ke Role Management**
- Klik menu **"Administrator"**
- Klik sub-menu **"Role Management"**
- URL: `http://localhost:3000/admin/roles`

---

## 📋 **TESTING CHECKLIST:**

### **✅ TEST 1: READ (Lihat Data)**
- [ ] Halaman Role Management terbuka
- [ ] Tabel menampilkan daftar roles
- [ ] Pagination bekerja (jika ada banyak data)
- [ ] Search box berfungsi
- [ ] Refresh button bekerja

**Expected:** Data roles tampil dengan benar

### **✅ TEST 2: CREATE (Tambah Role)**
- [ ] Klik tombol **"Add New Role"** atau **"+"**
- [ ] Form modal terbuka
- [ ] Isi field:
  - **Role Name:** `TestRole`
  - **Description:** `Role untuk testing`
- [ ] Klik **"Save"** atau **"Submit"**
- [ ] Modal tertutup
- [ ] Data baru muncul di tabel

**Expected:** Role baru berhasil ditambahkan

### **✅ TEST 3: UPDATE (Edit Role)**
- [ ] Klik tombol **"Edit"** pada role yang ada
- [ ] Form modal terbuka dengan data existing
- [ ] Ubah **Role Name** menjadi `TestRole_Updated`
- [ ] Klik **"Save"** atau **"Update"**
- [ ] Modal tertutup
- [ ] Data terupdate di tabel

**Expected:** Role berhasil diupdate

### **✅ TEST 4: DELETE (Hapus Role)**
- [ ] Klik tombol **"Delete"** pada role yang ingin dihapus
- [ ] Konfirmasi dialog muncul
- [ ] Klik **"Confirm"** atau **"Yes"**
- [ ] Role hilang dari tabel

**Expected:** Role berhasil dihapus

---

## 🚨 **TROUBLESHOOTING:**

### **❌ Jika halaman tidak terbuka:**
1. **Cek URL:** Pastikan `http://localhost:3000/admin/roles`
2. **Cek Login:** Pastikan sudah login sebagai admin
3. **Cek Console:** Buka F12 > Console, lihat error messages
4. **Refresh:** Coba refresh halaman

### **❌ Jika CRUD tidak bekerja:**
1. **Cek Network Tab:** F12 > Network, lihat API calls
2. **Cek Status Code:** 
   - 200 = Success
   - 400 = Bad Request
   - 401 = Unauthorized
   - 500 = Server Error
3. **Cek Response:** Lihat response dari API calls

### **❌ Jika ada error di console:**
1. **Copy error message**
2. **Cek line number** yang error
3. **Report ke developer** dengan detail error

---

## 🔧 **QUICK FIXES:**

### **Jika ada error "Cycle is not defined":**
```bash
# Di terminal, jalankan:
rm -rf .next
npm run dev
```

### **Jika aplikasi tidak merespons:**
```bash
# Restart aplikasi:
pkill -f "next dev"
npm run dev
```

### **Jika database error:**
- Cek file `.env.local`
- Pastikan `DATABASE_URL` benar
- Restart aplikasi

---

## 📊 **EXPECTED RESULTS:**

### **✅ Success Indicators:**
- Halaman Role Management terbuka tanpa error
- Tabel menampilkan data roles
- Form modal terbuka dan tertutup dengan benar
- Data berhasil di-create, update, delete
- Tidak ada error di browser console
- API calls return status 200

### **❌ Failure Indicators:**
- Halaman tidak terbuka (404/500)
- Tabel kosong atau tidak load
- Form tidak submit
- Error messages di console
- API calls return error status
- Loading infinite

---

## 📞 **REPORTING ISSUES:**

Jika masih ada masalah, berikan informasi:

1. **Browser:** Chrome/Firefox/Safari + version
2. **Error Message:** Copy dari console
3. **Steps:** Langkah-langkah yang dilakukan
4. **Expected:** Yang diharapkan terjadi
5. **Actual:** Yang benar-benar terjadi
6. **Screenshot:** Jika perlu

---

## 🎯 **TESTING PRIORITY:**

### **HIGH PRIORITY:**
- [ ] Halaman bisa dibuka
- [ ] Data bisa dilihat
- [ ] CRUD operations bekerja

### **MEDIUM PRIORITY:**
- [ ] Form validation
- [ ] Error handling
- [ ] UI/UX smooth

### **LOW PRIORITY:**
- [ ] Performance
- [ ] Edge cases
- [ ] Advanced features

**Dengan panduan ini, Anda bisa melakukan testing Role Management CRUD secara sistematis!** 🚀
