import psycopg2
import pandas as pd
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def connect_to_database():
    """Koneksi ke database PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'lifecycle_db'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'admin')
        )
        return conn
    except Exception as e:
        print(f"❌ Error koneksi database: {e}")
        return None

def verify_crjr_data():
    """Verifikasi kelengkapan data CRJR Monitoring"""
    conn = connect_to_database()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    print("=" * 60)
    print("🔍 VERIFIKASI DATA CRJR MONITORING")
    print("=" * 60)
    
    try:
        # 1. Cek total data
        cursor.execute("SELECT COUNT(*) FROM tbl_mon_crjr")
        total_records = cursor.fetchone()[0]
        print(f"📊 Total Records: {total_records}")
        
        # 2. Cek data berdasarkan tipe pekerjaan
        cursor.execute("""
            SELECT 
                tipe_pekerjaan,
                COUNT(*) as jumlah,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_mon_crjr), 2) as persentase
            FROM tbl_mon_crjr 
            GROUP BY tipe_pekerjaan 
            ORDER BY jumlah DESC
        """)
        
        print("\n📋 Distribusi Tipe Pekerjaan:")
        for row in cursor.fetchall():
            tipe, jumlah, persentase = row
            print(f"   {tipe}: {jumlah} records ({persentase}%)")
        
        # 3. Cek data berdasarkan status
        cursor.execute("""
            SELECT 
                status,
                COUNT(*) as jumlah,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_mon_crjr), 2) as persentase
            FROM tbl_mon_crjr 
            GROUP BY status 
            ORDER BY jumlah DESC
        """)
        
        print("\n📈 Distribusi Status:")
        for row in cursor.fetchall():
            status, jumlah, persentase = row
            print(f"   {status}: {jumlah} records ({persentase}%)")
        
        # 4. Cek data berdasarkan priority
        cursor.execute("""
            SELECT 
                priority,
                COUNT(*) as jumlah,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_mon_crjr), 2) as persentase
            FROM tbl_mon_crjr 
            GROUP BY priority 
            ORDER BY jumlah DESC
        """)
        
        print("\n🎯 Distribusi Priority:")
        for row in cursor.fetchall():
            priority, jumlah, persentase = row
            print(f"   {priority}: {jumlah} records ({persentase}%)")
        
        # 5. Cek field yang kosong
        cursor.execute("""
            SELECT 
                'tanggal_mulai' as field, COUNT(*) as kosong FROM tbl_mon_crjr WHERE tanggal_mulai IS NULL
            UNION ALL
            SELECT 'tanggal_akhir' as field, COUNT(*) as kosong FROM tbl_mon_crjr WHERE tanggal_akhir IS NULL
            UNION ALL
            SELECT 'pic' as field, COUNT(*) as kosong FROM tbl_mon_crjr WHERE pic IS NULL OR pic = ''
            UNION ALL
            SELECT 'deskripsi' as field, COUNT(*) as kosong FROM tbl_mon_crjr WHERE deskripsi IS NULL OR deskripsi = ''
            UNION ALL
            SELECT 'version' as field, COUNT(*) as kosong FROM tbl_mon_crjr WHERE version IS NULL OR version = ''
        """)
        
        print("\n⚠️  Field yang Kosong:")
        for row in cursor.fetchall():
            field, kosong = row
            if kosong > 0:
                print(f"   {field}: {kosong} records kosong")
        
        # 6. Sample data terbaru
        cursor.execute("""
            SELECT 
                mcr.id,
                p.produk as nama_produk,
                mcr.tipe_pekerjaan,
                mcr.status,
                mcr.priority,
                mcr.progress,
                mcr.pic,
                mcr.created_at
            FROM tbl_mon_crjr mcr
            LEFT JOIN tbl_produk p ON mcr.id_produk = p.id
            ORDER BY mcr.created_at DESC
            LIMIT 5
        """)
        
        print("\n📝 Sample Data Terbaru (5 records):")
        print("-" * 80)
        for row in cursor.fetchall():
            id_val, produk, tipe, status, priority, progress, pic, created = row
            print(f"ID: {id_val} | {produk} | {tipe} | {status} | {priority} | {progress}% | PIC: {pic}")
        
        # 7. Statistik untuk dashboard
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN tipe_pekerjaan = 'CR' THEN 1 ELSE 0 END) as cr,
                SUM(CASE WHEN tipe_pekerjaan = 'JR' THEN 1 ELSE 0 END) as jr,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Planned' THEN 1 ELSE 0 END) as planned,
                SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority,
                ROUND(AVG(progress), 2) as avg_progress
            FROM tbl_mon_crjr
        """)
        
        stats = cursor.fetchone()
        print("\n📊 Statistik Dashboard:")
        print(f"   Total: {stats[0]}")
        print(f"   CR: {stats[1]} | JR: {stats[2]}")
        print(f"   In Progress: {stats[3]} | Completed: {stats[4]} | Planned: {stats[5]}")
        print(f"   High Priority: {stats[6]}")
        print(f"   Average Progress: {stats[7]}%")
        
        # 8. Cek relasi dengan tbl_produk
        cursor.execute("""
            SELECT 
                COUNT(*) as total_crjr,
                COUNT(p.id) as with_product,
                COUNT(*) - COUNT(p.id) as without_product
            FROM tbl_mon_crjr mcr
            LEFT JOIN tbl_produk p ON mcr.id_produk = p.id
        """)
        
        relasi = cursor.fetchone()
        print(f"\n🔗 Relasi dengan Produk:")
        print(f"   Total CRJR: {relasi[0]}")
        print(f"   Dengan Produk: {relasi[1]}")
        print(f"   Tanpa Produk: {relasi[2]}")
        
        print("\n" + "=" * 60)
        
        if total_records > 0:
            print("✅ HASIL: Data CRJR tersedia dan siap ditampilkan")
            if relasi[2] > 0:
                print(f"⚠️  PERINGATAN: {relasi[2]} record tidak memiliki relasi produk")
        else:
            print("❌ HASIL: Tidak ada data CRJR dalam database")
            
    except Exception as e:
        print(f"❌ Error saat verifikasi: {e}")
    
    finally:
        cursor.close()
        conn.close()

def test_api_endpoints():
    """Test API endpoints CRJR"""
    import requests
    
    print("\n🔧 Testing API Endpoints:")
    
    base_url = "http://localhost:3000"
    
    # Test stats endpoint
    try:
        response = requests.get(f"{base_url}/api/monitoring/cr-jr/stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Stats API: Working")
            if data.get('success'):
                stats = data.get('data', {})
                print(f"   Total: {stats.get('total', 0)}")
                print(f"   CR: {stats.get('cr', 0)} | JR: {stats.get('jr', 0)}")
        else:
            print(f"❌ Stats API: Error {response.status_code}")
    except Exception as e:
        print(f"❌ Stats API: Connection error - {e}")
    
    # Test main endpoint
    try:
        response = requests.get(f"{base_url}/api/monitoring/cr-jr?page=1&limit=5", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Main API: Working")
            if data.get('success'):
                records = len(data.get('data', []))
                print(f"   Retrieved {records} records")
        else:
            print(f"❌ Main API: Error {response.status_code}")
    except Exception as e:
        print(f"❌ Main API: Connection error - {e}")

if __name__ == "__main__":
    verify_crjr_data()
    test_api_endpoints()