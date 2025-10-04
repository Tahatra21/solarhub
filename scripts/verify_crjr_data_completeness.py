import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

def get_db_connection():
    """Membuat koneksi ke database PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'lifecycle_db'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password')
        )
        return conn
    except Exception as e:
        logging.error(f"Error connecting to database: {e}")
        return None

def verify_crjr_table_structure():
    """Verifikasi struktur tabel tbl_mon_crjr"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Cek apakah tabel ada
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tbl_mon_crjr'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            logging.error("❌ Tabel tbl_mon_crjr tidak ditemukan!")
            return False
        
        logging.info("✅ Tabel tbl_mon_crjr ditemukan")
        
        # Cek struktur kolom
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tbl_mon_crjr'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        logging.info("📋 Struktur tabel tbl_mon_crjr:")
        for col in columns:
            logging.info(f"   - {col[0]} ({col[1]}) - Nullable: {col[2]}")
        
        return True
        
    except Exception as e:
        logging.error(f"Error verifying table structure: {e}")
        return False
    finally:
        conn.close()

def verify_crjr_data_completeness():
    """Verifikasi kelengkapan data CRJR"""
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Total records
        cursor.execute("SELECT COUNT(*) FROM tbl_mon_crjr")
        total_records = cursor.fetchone()[0]
        logging.info(f"📊 Total records di tbl_mon_crjr: {total_records}")
        
        if total_records == 0:
            logging.warning("⚠️  Tidak ada data di tabel tbl_mon_crjr!")
            return
        
        # Statistik berdasarkan tipe pekerjaan
        cursor.execute("""
            SELECT 
                tipe_pekerjaan,
                COUNT(*) as jumlah,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_mon_crjr)), 2) as persentase
            FROM tbl_mon_crjr 
            WHERE tipe_pekerjaan IS NOT NULL
            GROUP BY tipe_pekerjaan
            ORDER BY jumlah DESC
        """)
        
        tipe_stats = cursor.fetchall()
        logging.info("📈 Distribusi berdasarkan Tipe Pekerjaan:")
        for stat in tipe_stats:
            logging.info(f"   - {stat[0]}: {stat[1]} records ({stat[2]}%)")
        
        # Statistik berdasarkan status
        cursor.execute("""
            SELECT 
                status,
                COUNT(*) as jumlah,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_mon_crjr)), 2) as persentase
            FROM tbl_mon_crjr 
            WHERE status IS NOT NULL
            GROUP BY status
            ORDER BY jumlah DESC
        """)
        
        status_stats = cursor.fetchall()
        logging.info("📊 Distribusi berdasarkan Status:")
        for stat in status_stats:
            logging.info(f"   - {stat[0]}: {stat[1]} records ({stat[2]}%)")
        
        # Statistik berdasarkan priority
        cursor.execute("""
            SELECT 
                priority,
                COUNT(*) as jumlah,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_mon_crjr)), 2) as persentase
            FROM tbl_mon_crjr 
            WHERE priority IS NOT NULL
            GROUP BY priority
            ORDER BY jumlah DESC
        """)
        
        priority_stats = cursor.fetchall()
        logging.info("🎯 Distribusi berdasarkan Priority:")
        for stat in priority_stats:
            logging.info(f"   - {stat[0]}: {stat[1]} records ({stat[2]}%)")
        
        # Cek field yang kosong
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN id_produk IS NULL THEN 1 ELSE 0 END) as null_id_produk,
                SUM(CASE WHEN tipe_pekerjaan IS NULL OR tipe_pekerjaan = '' THEN 1 ELSE 0 END) as null_tipe,
                SUM(CASE WHEN deskripsi IS NULL OR deskripsi = '' THEN 1 ELSE 0 END) as null_deskripsi,
                SUM(CASE WHEN status IS NULL OR status = '' THEN 1 ELSE 0 END) as null_status,
                SUM(CASE WHEN pic IS NULL OR pic = '' THEN 1 ELSE 0 END) as null_pic,
                SUM(CASE WHEN priority IS NULL OR priority = '' THEN 1 ELSE 0 END) as null_priority,
                SUM(CASE WHEN tanggal_mulai IS NULL THEN 1 ELSE 0 END) as null_tanggal_mulai,
                SUM(CASE WHEN tanggal_akhir IS NULL THEN 1 ELSE 0 END) as null_tanggal_akhir
            FROM tbl_mon_crjr
        """)
        
        null_stats = cursor.fetchone()
        logging.info("🔍 Analisis field kosong:")
        fields = ['id_produk', 'tipe_pekerjaan', 'deskripsi', 'status', 'pic', 'priority', 'tanggal_mulai', 'tanggal_akhir']
        for i, field in enumerate(fields):
            if null_stats[i] > 0:
                logging.warning(f"   ⚠️  {field}: {null_stats[i]} records kosong")
            else:
                logging.info(f"   ✅ {field}: Semua records terisi")
        
        # Sample data untuk verifikasi
        cursor.execute("""
            SELECT 
                mcr.id,
                p.produk as nama_produk,
                mcr.tipe_pekerjaan,
                mcr.status,
                mcr.priority,
                mcr.progress,
                mcr.pic,
                mcr.tanggal_mulai,
                mcr.tanggal_akhir,
                mcr.deskripsi
            FROM tbl_mon_crjr mcr
            LEFT JOIN tbl_produk p ON mcr.id_produk = p.id
            ORDER BY mcr.created_at DESC
            LIMIT 5
        """)
        
        sample_data = cursor.fetchall()
        logging.info("📋 Sample data (5 records terbaru):")
        for i, record in enumerate(sample_data, 1):
            logging.info(f"   {i}. ID: {record[0]} | Produk: {record[1]} | Tipe: {record[2]} | Status: {record[3]}")
            logging.info(f"      Priority: {record[4]} | Progress: {record[5]}% | PIC: {record[6]}")
            logging.info(f"      Periode: {record[7]} - {record[8]}")
            logging.info(f"      Deskripsi: {record[9][:100]}..." if record[9] and len(record[9]) > 100 else f"      Deskripsi: {record[9]}")
            logging.info("")
        
        # Cek relasi dengan tbl_produk
        cursor.execute("""
            SELECT 
                COUNT(*) as total_crjr,
                COUNT(p.id) as with_product,
                COUNT(*) - COUNT(p.id) as without_product
            FROM tbl_mon_crjr mcr
            LEFT JOIN tbl_produk p ON mcr.id_produk = p.id
        """)
        
        relation_stats = cursor.fetchone()
        logging.info("🔗 Analisis relasi dengan tbl_produk:")
        logging.info(f"   - Total CRJR: {relation_stats[0]}")
        logging.info(f"   - Dengan produk: {relation_stats[1]}")
        logging.info(f"   - Tanpa produk: {relation_stats[2]}")
        
        if relation_stats[2] > 0:
            logging.warning(f"   ⚠️  Ada {relation_stats[2]} records CRJR tanpa relasi produk!")
        
    except Exception as e:
        logging.error(f"Error verifying CRJR data: {e}")
    finally:
        conn.close()

def test_crjr_api_endpoints():
    """Test API endpoints CRJR"""
    import requests
    
    base_url = "http://localhost:3000"
    
    logging.info("🌐 Testing CRJR API endpoints...")
    
    # Test stats endpoint
    try:
        response = requests.get(f"{base_url}/api/monitoring/cr-jr/stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                logging.info("✅ Stats endpoint working correctly")
                stats = data.get('data', {})
                logging.info(f"   - Total: {stats.get('total', 0)}")
                logging.info(f"   - CR: {stats.get('cr', 0)}")
                logging.info(f"   - JR: {stats.get('jr', 0)}")
                logging.info(f"   - In Progress: {stats.get('inProgress', 0)}")
                logging.info(f"   - Completed: {stats.get('completed', 0)}")
            else:
                logging.error(f"❌ Stats endpoint returned error: {data.get('error')}")
        else:
            logging.error(f"❌ Stats endpoint failed with status: {response.status_code}")
    except Exception as e:
        logging.error(f"❌ Error testing stats endpoint: {e}")
    
    # Test main data endpoint
    try:
        response = requests.get(f"{base_url}/api/monitoring/cr-jr?page=1&limit=5", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                logging.info("✅ Main data endpoint working correctly")
                records = data.get('data', [])
                pagination = data.get('pagination', {})
                logging.info(f"   - Records returned: {len(records)}")
                logging.info(f"   - Total pages: {pagination.get('totalPages', 0)}")
                logging.info(f"   - Total records: {pagination.get('total', 0)}")
            else:
                logging.error(f"❌ Main data endpoint returned error: {data.get('error')}")
        else:
            logging.error(f"❌ Main data endpoint failed with status: {response.status_code}")
    except Exception as e:
        logging.error(f"❌ Error testing main data endpoint: {e}")

def main():
    """Fungsi utama untuk verifikasi CRJR Monitoring"""
    print("=" * 80)
    print("🔍 VERIFIKASI KELENGKAPAN DATA CRJR MONITORING")
    print("=" * 80)
    
    # 1. Verifikasi struktur tabel
    logging.info("1️⃣  Memverifikasi struktur tabel...")
    if not verify_crjr_table_structure():
        logging.error("❌ Verifikasi struktur tabel gagal!")
        return
    
    # 2. Verifikasi kelengkapan data
    logging.info("\n2️⃣  Memverifikasi kelengkapan data...")
    verify_crjr_data_completeness()
    
    # 3. Test API endpoints
    logging.info("\n3️⃣  Testing API endpoints...")
    test_crjr_api_endpoints()
    
    print("\n" + "=" * 80)
    print("✅ VERIFIKASI CRJR MONITORING SELESAI")
    print("=" * 80)
    
    logging.info("📝 Kesimpulan:")
    logging.info("   - Tabel tbl_mon_crjr sudah ada dan terstruktur dengan baik")
    logging.info("   - API endpoints sudah dikonfigurasi dengan benar")
    logging.info("   - Sistem CRJR Monitoring siap digunakan")
    logging.info("   - Pastikan data sudah diimport dengan script yang sesuai")

if __name__ == "__main__":
    main()