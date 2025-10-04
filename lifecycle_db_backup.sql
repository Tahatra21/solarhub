--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Homebrew)
-- Dumped by pg_dump version 16.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auto_transition_product_lifecycle(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_transition_product_lifecycle() RETURNS TABLE(produk_id integer, produk_name character varying, stage_lama character varying, stage_baru character varying, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    rec RECORD;
    stage_lama VARCHAR;
    stage_baru VARCHAR;
    stage_id_baru INTEGER;
    interval_bulan INTEGER;
BEGIN
    -- Loop melalui semua produk yang tanggal_stage_end sudah lewat
    FOR rec IN 
        SELECT 
            p.id,
            p.produk,
            p.id_stage,
            s.stage as current_stage,
            p.tanggal_stage_end
        FROM tbl_produk p
        JOIN tbl_stage s ON p.id_stage = s.id
        WHERE p.tanggal_stage_end < CURRENT_DATE
        AND p.id_stage IS NOT NULL
    LOOP
        stage_lama := rec.current_stage;
        
        -- Tentukan stage berikutnya berdasarkan current stage
        CASE rec.current_stage
            WHEN 'Introduction' THEN
                SELECT id INTO stage_id_baru FROM tbl_stage WHERE stage = 'Growth';
                stage_baru := 'Growth';
            WHEN 'Growth' THEN
                SELECT id INTO stage_id_baru FROM tbl_stage WHERE stage = 'Maturity';
                stage_baru := 'Maturity';
            WHEN 'Maturity' THEN
                SELECT id INTO stage_id_baru FROM tbl_stage WHERE stage = 'Decline';
                stage_baru := 'Decline';
            WHEN 'Decline' THEN
                -- Produk sudah di tahap akhir, tidak ada transisi lagi
                stage_baru := 'Decline';
                stage_id_baru := rec.id_stage;
        END CASE;
        
        -- Jika ada stage berikutnya (bukan Decline ke Decline)
        IF stage_lama != stage_baru THEN
            -- Ambil interval untuk stage baru
            SELECT "interval" INTO interval_bulan 
            FROM tbl_interval_stage 
            WHERE id_stage = stage_id_baru;
            
            -- Jika tidak ada interval, gunakan default 6 bulan
            IF interval_bulan IS NULL THEN
                interval_bulan := 6;
            END IF;
            
            -- Update produk ke stage baru
            UPDATE tbl_produk 
            SET 
                id_stage = stage_id_baru,
                tanggal_stage_start = CURRENT_DATE,
                tanggal_stage_end = CURRENT_DATE + (interval_bulan || ' months')::INTERVAL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = rec.id;
            
            -- Simpan ke history
            INSERT INTO tbl_stage_histori (
                id_produk,
                stage_previous,
                stage_now,
                catatan,
                created_at,
                updated_at
            ) VALUES (
                rec.id,
                stage_lama,
                stage_baru,
                'Auto-transition by scheduler on ' || CURRENT_DATE::TEXT,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            
            -- Return hasil untuk monitoring
            RETURN QUERY SELECT 
                rec.id,
                rec.produk,
                stage_lama,
                stage_baru,
                ('Successfully transitioned from ' || stage_lama || ' to ' || stage_baru)::TEXT;
                
        ELSE
            -- Produk sudah di tahap akhir
            RETURN QUERY SELECT 
                rec.id,
                rec.produk,
                stage_lama,
                stage_baru,
                'Product already in final stage (Decline)'::TEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$;


ALTER FUNCTION public.auto_transition_product_lifecycle() OWNER TO postgres;

--
-- Name: generate_expiry_notifications(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_expiry_notifications() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    license_record RECORD;
    notif_date DATE;
BEGIN
    -- Clear old notifications
    DELETE FROM tbl_license_notifications 
    WHERE tbl_license_notifications.notification_date < CURRENT_DATE - INTERVAL '60 days';
    
    -- Generate notifications for licenses expiring in 30 days
    FOR license_record IN 
        SELECT id, nama_aplikasi, akhir_layanan 
        FROM tbl_mon_licenses 
        WHERE akhir_layanan != '9999-12-31' 
        AND akhir_layanan > CURRENT_DATE 
        AND akhir_layanan <= CURRENT_DATE + INTERVAL '30 days'
    LOOP
        -- Generate notifications every 2 days starting from 30 days before expiry
        notif_date := license_record.akhir_layanan - INTERVAL '30 days';
        
        WHILE notif_date <= license_record.akhir_layanan LOOP
            -- Insert notification if not exists
            INSERT INTO tbl_license_notifications (license_id, notification_type, notification_date)
            SELECT license_record.id, 'expiring_soon', notif_date
            WHERE NOT EXISTS (
                SELECT 1 FROM tbl_license_notifications 
                WHERE license_id = license_record.id 
                AND tbl_license_notifications.notification_date = notif_date
            );
            
            notif_date := notif_date + INTERVAL '2 days';
        END LOOP;
    END LOOP;
    
    -- Generate notifications for expired licenses
    INSERT INTO tbl_license_notifications (license_id, notification_type, notification_date)
    SELECT id, 'expired', CURRENT_DATE
    FROM tbl_mon_licenses 
    WHERE akhir_layanan != '9999-12-31' 
    AND akhir_layanan < CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 FROM tbl_license_notifications 
        WHERE license_id = tbl_mon_licenses.id 
        AND tbl_license_notifications.notification_type = 'expired'
        AND tbl_license_notifications.notification_date = CURRENT_DATE
    );
END;
$$;


ALTER FUNCTION public.generate_expiry_notifications() OWNER TO postgres;

--
-- Name: generate_no_urut(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_no_urut() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.no_urut IS NULL THEN
        SELECT COALESCE(MAX(no_urut), 0) + 1 INTO NEW.no_urut FROM tbl_mon_licenses;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_no_urut() OWNER TO postgres;

--
-- Name: get_pending_notifications(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_pending_notifications() RETURNS TABLE(notification_id integer, license_id integer, nama_aplikasi character varying, notification_type character varying, akhir_layanan date, days_until_expiry integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id as notification_id,
        n.license_id,
        l.nama_aplikasi,
        n.notification_type,
        l.akhir_layanan,
        CASE 
            WHEN l.akhir_layanan = '9999-12-31' THEN NULL
            ELSE (l.akhir_layanan - CURRENT_DATE)::INTEGER
        END as days_until_expiry
    FROM tbl_license_notifications n
    JOIN tbl_mon_licenses l ON n.license_id = l.id
    WHERE n.notification_date = CURRENT_DATE
    AND n.is_sent = FALSE
    ORDER BY n.notification_type, l.akhir_layanan;
END;
$$;


ALTER FUNCTION public.get_pending_notifications() OWNER TO postgres;

--
-- Name: mark_notification_sent(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_notification_sent(notification_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE tbl_license_notifications 
    SET is_sent = TRUE, sent_at = CURRENT_TIMESTAMP
    WHERE id = notification_id;
END;
$$;


ALTER FUNCTION public.mark_notification_sent(notification_id integer) OWNER TO postgres;

--
-- Name: run_lifecycle_scheduler(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.run_lifecycle_scheduler() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    result_count INTEGER := 0;
    rec RECORD;
BEGIN
    -- Hitung berapa produk yang akan di-update
    SELECT COUNT(*) INTO result_count
    FROM tbl_produk p
    JOIN tbl_stage s ON p.id_stage = s.id
    WHERE p.tanggal_stage_end < CURRENT_DATE
    AND p.id_stage IS NOT NULL
    AND s.stage != 'Decline';
    
    -- Jalankan auto transition
    PERFORM auto_transition_product_lifecycle();
    
    -- Log hasil
    INSERT INTO tbl_stage_histori (
        id_produk,
        stage_previous,
        stage_now,
        catatan,
        created_at,
        updated_at
    ) VALUES (
        0, -- id_produk 0 untuk sistem log
        'SYSTEM',
        'SCHEDULER_RUN',
        'Scheduler executed at ' || CURRENT_TIMESTAMP || '. Processed ' || result_count || ' products.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
    
    RETURN 'Scheduler completed. Processed ' || result_count || ' products.';
END;
$$;


ALTER FUNCTION public.run_lifecycle_scheduler() OWNER TO postgres;

--
-- Name: update_license_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_license_status() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE tbl_mon_licenses 
    SET status = CASE 
        WHEN akhir_layanan = '9999-12-31' THEN 'Perpetual'
        WHEN akhir_layanan < CURRENT_DATE THEN 'Expired'
        WHEN (akhir_layanan - CURRENT_DATE) <= 30 THEN 'Expiring Soon'
        ELSE 'Active'
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE akhir_layanan != '9999-12-31';
END;
$$;


ALTER FUNCTION public.update_license_status() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: tbl_mon_licenses; Type: TABLE; Schema: public; Owner: jmaharyuda
--

CREATE TABLE public.tbl_mon_licenses (
    id integer NOT NULL,
    no_urut integer,
    nama_aplikasi character varying(255) NOT NULL,
    bpo character varying(100),
    jenis_lisensi character varying(255),
    jumlah integer DEFAULT 0,
    harga_satuan numeric(15,2) DEFAULT 0,
    harga_total numeric(15,2) DEFAULT 0,
    periode_po integer DEFAULT 0,
    kontrak_layanan_bulan integer DEFAULT 0,
    start_layanan date,
    akhir_layanan date,
    metode character varying(50),
    keterangan_akun text,
    tanggal_aktivasi date,
    tanggal_pembaharuan date,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    selling_price numeric(15,2) DEFAULT 0,
    purchase_price_per_unit numeric(15,2) DEFAULT 0,
    total_purchase_price numeric(15,2) DEFAULT 0,
    total_selling_price numeric(15,2) DEFAULT 0
);


ALTER TABLE public.tbl_mon_licenses OWNER TO jmaharyuda;

--
-- Name: monitoring_licenses_id_seq1; Type: SEQUENCE; Schema: public; Owner: jmaharyuda
--

CREATE SEQUENCE public.monitoring_licenses_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.monitoring_licenses_id_seq1 OWNER TO jmaharyuda;

--
-- Name: monitoring_licenses_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: jmaharyuda
--

ALTER SEQUENCE public.monitoring_licenses_id_seq1 OWNED BY public.tbl_mon_licenses.id;


--
-- Name: tbl_activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_activity_log (
    id integer NOT NULL,
    user_id integer NOT NULL,
    username character varying(100) NOT NULL,
    activity_type character varying(50) NOT NULL,
    activity_description text,
    ip_address inet,
    user_agent text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tbl_activity_log OWNER TO postgres;

--
-- Name: tbl_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_activity_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_activity_log_id_seq OWNER TO postgres;

--
-- Name: tbl_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_activity_log_id_seq OWNED BY public.tbl_activity_log.id;


--
-- Name: tbl_attachment_produk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_attachment_produk (
    id integer NOT NULL,
    produk_id integer NOT NULL,
    nama_attachment character varying NOT NULL,
    url_attachment character varying,
    size character varying,
    type character varying,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone
);


ALTER TABLE public.tbl_attachment_produk OWNER TO postgres;

--
-- Name: tbl_attachment_produk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_attachment_produk_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_attachment_produk_id_seq OWNER TO postgres;

--
-- Name: tbl_attachment_produk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_attachment_produk_id_seq OWNED BY public.tbl_attachment_produk.id;


--
-- Name: tbl_attachment_produk_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_attachment_produk ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_attachment_produk_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_interval_stage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_interval_stage (
    id integer NOT NULL,
    id_stage integer NOT NULL,
    keterangan text,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    "interval" integer,
    id_produk integer NOT NULL
);


ALTER TABLE public.tbl_interval_stage OWNER TO postgres;

--
-- Name: tbl_interval_stage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_interval_stage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_interval_stage_id_seq OWNER TO postgres;

--
-- Name: tbl_interval_stage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_interval_stage_id_seq OWNED BY public.tbl_interval_stage.id;


--
-- Name: tbl_interval_stage_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_interval_stage ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_interval_stage_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_jabatan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_jabatan (
    id integer NOT NULL,
    jabatan character varying NOT NULL,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone
);


ALTER TABLE public.tbl_jabatan OWNER TO postgres;

--
-- Name: tbl_jabatan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_jabatan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_jabatan_id_seq OWNER TO postgres;

--
-- Name: tbl_jabatan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_jabatan_id_seq OWNED BY public.tbl_jabatan.id;


--
-- Name: tbl_jabatan_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_jabatan ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_jabatan_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_kategori; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_kategori (
    id integer NOT NULL,
    kategori character varying NOT NULL,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    icon_light character varying,
    icon_dark character varying
);


ALTER TABLE public.tbl_kategori OWNER TO postgres;

--
-- Name: tbl_kategori_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_kategori_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_kategori_id_seq OWNER TO postgres;

--
-- Name: tbl_kategori_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_kategori_id_seq OWNED BY public.tbl_kategori.id;


--
-- Name: tbl_kategori_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_kategori ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_kategori_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_license_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_license_notifications (
    id integer NOT NULL,
    license_id integer,
    notification_type character varying(50) NOT NULL,
    notification_date date NOT NULL,
    is_sent boolean DEFAULT false,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tbl_license_notifications OWNER TO postgres;

--
-- Name: tbl_license_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_license_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tbl_license_notifications_id_seq OWNER TO postgres;

--
-- Name: tbl_license_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_license_notifications_id_seq OWNED BY public.tbl_license_notifications.id;


--
-- Name: tbl_mon_crjr_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_mon_crjr_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_mon_crjr_id_seq OWNER TO postgres;

--
-- Name: tbl_mon_crjr; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_mon_crjr (
    id integer DEFAULT nextval('public.tbl_mon_crjr_id_seq'::regclass) NOT NULL,
    id_produk integer NOT NULL,
    tipe_pekerjaan character varying(100),
    tanggal_mulai date,
    tanggal_akhir date,
    version character varying(10),
    deskripsi text,
    status character varying(50),
    progress integer DEFAULT 0,
    pic character varying(100),
    priority character varying(20) DEFAULT 'Medium'::character varying,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tbl_mon_crjr OWNER TO postgres;

--
-- Name: tbl_produk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_produk (
    id integer NOT NULL,
    produk character varying(255),
    deskripsi text,
    id_kategori integer,
    id_segmen integer,
    id_stage integer,
    harga bigint,
    tanggal_launch date,
    pelanggan character varying(255),
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    tanggal_stage_end date,
    tanggal_stage_start date
);


ALTER TABLE public.tbl_produk OWNER TO postgres;

--
-- Name: tbl_produk_dev_histori; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_produk_dev_histori (
    id integer NOT NULL,
    id_produk integer NOT NULL,
    tipe_pekerjaan character varying(100),
    tanggal_mulai date,
    tanggal_akhir date,
    version character varying(10),
    deskripsi text,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    status character varying
);


ALTER TABLE public.tbl_produk_dev_histori OWNER TO postgres;

--
-- Name: tbl_produk_dev_histori_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_produk_dev_histori_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_produk_dev_histori_id_seq OWNER TO postgres;

--
-- Name: tbl_produk_dev_histori_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_produk_dev_histori_id_seq OWNED BY public.tbl_produk_dev_histori.id;


--
-- Name: tbl_produk_dev_histori_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_produk_dev_histori ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_produk_dev_histori_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_produk_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_produk_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_produk_id_seq OWNER TO postgres;

--
-- Name: tbl_produk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_produk_id_seq OWNED BY public.tbl_produk.id;


--
-- Name: tbl_produk_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_produk ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_produk_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_role (
    id integer NOT NULL,
    role character varying(100) NOT NULL,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone
);


ALTER TABLE public.tbl_role OWNER TO postgres;

--
-- Name: tbl_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_role_id_seq OWNER TO postgres;

--
-- Name: tbl_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_role_id_seq OWNED BY public.tbl_role.id;


--
-- Name: tbl_role_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_role ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_role_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_segmen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_segmen (
    id integer NOT NULL,
    segmen character varying NOT NULL,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    icon_light character varying,
    icon_dark character varying
);


ALTER TABLE public.tbl_segmen OWNER TO postgres;

--
-- Name: tbl_segmen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_segmen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_segmen_id_seq OWNER TO postgres;

--
-- Name: tbl_segmen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_segmen_id_seq OWNED BY public.tbl_segmen.id;


--
-- Name: tbl_segmen_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_segmen ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_segmen_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_stage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_stage (
    id integer NOT NULL,
    stage character varying,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    icon_light character varying,
    icon_dark character varying
);


ALTER TABLE public.tbl_stage OWNER TO postgres;

--
-- Name: tbl_stage_histori; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_stage_histori (
    id integer NOT NULL,
    id_produk integer NOT NULL,
    stage_previous integer,
    stage_now integer,
    catatan text,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    tanggal_perubahan timestamp(6) with time zone,
    performance_metrics jsonb
);


ALTER TABLE public.tbl_stage_histori OWNER TO postgres;

--
-- Name: tbl_stage_histori_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_stage_histori_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_stage_histori_id_seq OWNER TO postgres;

--
-- Name: tbl_stage_histori_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_stage_histori_id_seq OWNED BY public.tbl_stage_histori.id;


--
-- Name: tbl_stage_histori_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_stage_histori ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_stage_histori_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_stage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_stage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.tbl_stage_id_seq OWNER TO postgres;

--
-- Name: tbl_stage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_stage_id_seq OWNED BY public.tbl_stage.id;


--
-- Name: tbl_stage_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_stage ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_stage_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tbl_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tbl_user (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    photo character varying(255),
    role integer NOT NULL,
    jabatan integer,
    password text NOT NULL,
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    fullname character varying(100)
);


ALTER TABLE public.tbl_user OWNER TO postgres;

--
-- Name: tbl_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tbl_user_id_seq
    START WITH 2
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 999999
    CACHE 1;


ALTER SEQUENCE public.tbl_user_id_seq OWNER TO postgres;

--
-- Name: tbl_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tbl_user_id_seq OWNED BY public.tbl_user.id;


--
-- Name: tbl_user_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tbl_user ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tbl_user_id_seq1
    START WITH 2
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 999999
    CACHE 1
);


--
-- Name: v_monitoring_licenses_report; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_monitoring_licenses_report AS
 SELECT id,
    no_urut,
    nama_aplikasi,
    bpo,
    jenis_lisensi,
    jumlah,
    COALESCE(purchase_price_per_unit, harga_satuan) AS purchase_price_per_unit,
    COALESCE(total_purchase_price, harga_total) AS total_purchase_price,
    selling_price,
    total_selling_price,
    periode_po,
    kontrak_layanan_bulan,
    start_layanan,
    akhir_layanan,
    metode,
    keterangan_akun,
    tanggal_aktivasi,
    tanggal_pembaharuan,
    status,
        CASE
            WHEN (akhir_layanan = '9999-12-31'::date) THEN 'PERPETUAL'::text
            WHEN (akhir_layanan < CURRENT_DATE) THEN 'EXPIRED'::text
            WHEN ((akhir_layanan - CURRENT_DATE) <= 30) THEN 'EXPIRING_SOON'::text
            ELSE 'ACTIVE'::text
        END AS license_status,
        CASE
            WHEN (akhir_layanan = '9999-12-31'::date) THEN NULL::integer
            ELSE (akhir_layanan - CURRENT_DATE)
        END AS days_until_expiry,
    created_at,
    updated_at
   FROM public.tbl_mon_licenses
  ORDER BY no_urut;


ALTER VIEW public.v_monitoring_licenses_report OWNER TO postgres;

--
-- Name: tbl_activity_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_activity_log ALTER COLUMN id SET DEFAULT nextval('public.tbl_activity_log_id_seq'::regclass);


--
-- Name: tbl_license_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_license_notifications ALTER COLUMN id SET DEFAULT nextval('public.tbl_license_notifications_id_seq'::regclass);


--
-- Name: tbl_mon_licenses id; Type: DEFAULT; Schema: public; Owner: jmaharyuda
--

ALTER TABLE ONLY public.tbl_mon_licenses ALTER COLUMN id SET DEFAULT nextval('public.monitoring_licenses_id_seq1'::regclass);


--
-- Data for Name: tbl_activity_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_activity_log (id, user_id, username, activity_type, activity_description, ip_address, user_agent, created_at) FROM stdin;
1	1	admin	password_change	Password berhasil diubah	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 13:39:31.367419+07
2	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 13:39:59.654317+07
3	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 13:40:15.792363+07
4	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 13:59:08.050532+07
5	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 13:59:19.683885+07
6	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 14:04:44.976001+07
7	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 14:05:06.809529+07
8	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 14:06:07.588034+07
9	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 14:12:07.149798+07
10	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-04 16:59:45.129054+07
11	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-05 07:55:36.6102+07
12	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-05 13:10:50.81715+07
13	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-05 13:18:15.103246+07
14	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-06 07:45:58.335065+07
15	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-06 07:48:33.527163+07
16	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-06 09:44:08.399578+07
17	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-06 09:44:30.144624+07
18	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-07 09:47:30.128176+07
19	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-11 07:56:41.526463+07
20	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-12 15:52:24.19465+07
21	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-08-12 17:25:10.028894+07
22	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-12 17:25:34.024362+07
23	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-12 17:25:34.025192+07
24	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-12 17:25:49.537331+07
25	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-12 17:49:28.548187+07
26	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-12 17:49:43.967623+07
27	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-12 17:51:18.333168+07
28	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-12 19:33:43.59469+07
29	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-14 10:34:52.280001+07
30	1	admin	logout	User berhasil logout	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-14 15:40:08.761184+07
31	1	admin	login	User berhasil login	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	2025-08-14 15:40:32.640249+07
\.


--
-- Data for Name: tbl_attachment_produk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_attachment_produk (id, produk_id, nama_attachment, url_attachment, size, type, created_at, updated_at) FROM stdin;
9	20	Panduan WLKP.pdf	/pdf/1753687759192_Panduan WLKP.pdf	2126686	application/pdf	2025-07-28 14:29:19.181+07	\N
10	20	20_Panduan WLKPs.pdf	/pdf/1753688207115_20_Panduan WLKPs.pdf	2126686	application/pdf	2025-07-28 14:36:47.125368+07	\N
\.


--
-- Data for Name: tbl_interval_stage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_interval_stage (id, id_stage, keterangan, created_at, updated_at, "interval", id_produk) FROM stdin;
1	1	\N	2022-01-15 00:00:00+07	2022-01-15 00:00:00+07	6	1
2	2	\N	2022-07-15 00:00:00+07	2022-07-15 00:00:00+07	12	1
3	3	\N	2023-07-15 00:00:00+07	2023-07-15 00:00:00+07	18	1
4	4	\N	2025-01-15 00:00:00+07	2025-01-15 00:00:00+07	6	1
5	1	\N	2022-03-01 00:00:00+07	2022-03-01 00:00:00+07	4	6
6	2	\N	2022-07-01 00:00:00+07	2022-07-01 00:00:00+07	8	6
7	3	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	15	6
8	1	\N	2022-06-01 00:00:00+07	2022-06-01 00:00:00+07	5	11
9	2	\N	2022-11-01 00:00:00+07	2022-11-01 00:00:00+07	10	11
10	3	\N	2023-09-01 00:00:00+07	2023-09-01 00:00:00+07	12	11
11	1	\N	2023-01-01 00:00:00+07	2023-01-01 00:00:00+07	7	16
12	2	\N	2023-08-01 00:00:00+07	2023-08-01 00:00:00+07	14	16
13	1	\N	2023-04-01 00:00:00+07	2023-04-01 00:00:00+07	3	21
14	2	\N	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	9	21
15	1	\N	2022-02-01 00:00:00+07	2022-02-01 00:00:00+07	8	2
16	2	\N	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	15	2
17	3	\N	2024-01-01 00:00:00+07	2024-01-01 00:00:00+07	20	2
18	4	\N	2025-09-01 00:00:00+07	2025-09-01 00:00:00+07	8	2
19	1	\N	2022-04-15 00:00:00+07	2022-04-15 00:00:00+07	6	7
20	2	\N	2022-10-15 00:00:00+07	2022-10-15 00:00:00+07	12	7
21	3	\N	2023-10-15 00:00:00+07	2023-10-15 00:00:00+07	18	7
22	1	\N	2022-08-01 00:00:00+07	2022-08-01 00:00:00+07	9	12
23	2	\N	2023-05-01 00:00:00+07	2023-05-01 00:00:00+07	16	12
24	3	\N	2024-09-01 00:00:00+07	2024-09-01 00:00:00+07	22	12
25	1	\N	2023-02-15 00:00:00+07	2023-02-15 00:00:00+07	7	17
26	2	\N	2023-09-15 00:00:00+07	2023-09-15 00:00:00+07	13	17
27	1	\N	2023-05-01 00:00:00+07	2023-05-01 00:00:00+07	5	22
28	2	\N	2023-10-01 00:00:00+07	2023-10-01 00:00:00+07	11	22
29	1	\N	2022-01-20 00:00:00+07	2022-01-20 00:00:00+07	4	3
30	2	\N	2022-05-20 00:00:00+07	2022-05-20 00:00:00+07	10	3
31	3	\N	2023-03-20 00:00:00+07	2023-03-20 00:00:00+07	14	3
32	4	\N	2024-05-20 00:00:00+07	2024-05-20 00:00:00+07	5	3
33	1	\N	2022-05-01 00:00:00+07	2022-05-01 00:00:00+07	5	8
34	2	\N	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	8	8
35	3	\N	2023-06-01 00:00:00+07	2023-06-01 00:00:00+07	12	8
36	1	\N	2022-09-01 00:00:00+07	2022-09-01 00:00:00+07	6	13
37	2	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	11	13
38	3	\N	2024-02-01 00:00:00+07	2024-02-01 00:00:00+07	16	13
39	1	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	4	18
40	2	\N	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	9	18
41	1	\N	2023-06-01 00:00:00+07	2023-06-01 00:00:00+07	7	23
42	2	\N	2024-01-01 00:00:00+07	2024-01-01 00:00:00+07	12	23
43	1	\N	2022-02-10 00:00:00+07	2022-02-10 00:00:00+07	3	4
44	2	\N	2022-05-10 00:00:00+07	2022-05-10 00:00:00+07	7	4
45	3	\N	2022-12-10 00:00:00+07	2022-12-10 00:00:00+07	10	4
46	4	\N	2023-10-10 00:00:00+07	2023-10-10 00:00:00+07	4	4
47	1	\N	2022-06-01 00:00:00+07	2022-06-01 00:00:00+07	4	9
48	2	\N	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	6	9
49	3	\N	2023-04-01 00:00:00+07	2023-04-01 00:00:00+07	9	9
50	1	\N	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	5	14
51	2	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	8	14
52	3	\N	2023-11-01 00:00:00+07	2023-11-01 00:00:00+07	11	14
53	1	\N	2023-04-01 00:00:00+07	2023-04-01 00:00:00+07	3	19
54	2	\N	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	6	19
55	1	\N	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	4	24
56	2	\N	2023-11-01 00:00:00+07	2023-11-01 00:00:00+07	7	24
57	1	\N	2022-03-01 00:00:00+07	2022-03-01 00:00:00+07	9	5
58	2	\N	2022-12-01 00:00:00+07	2022-12-01 00:00:00+07	18	5
59	3	\N	2024-06-01 00:00:00+07	2024-06-01 00:00:00+07	24	5
60	4	\N	2026-06-01 00:00:00+07	2026-06-01 00:00:00+07	10	5
61	1	\N	2022-07-01 00:00:00+07	2022-07-01 00:00:00+07	8	10
62	2	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	15	10
63	3	\N	2024-06-01 00:00:00+07	2024-06-01 00:00:00+07	20	10
64	1	\N	2022-11-01 00:00:00+07	2022-11-01 00:00:00+07	10	15
65	2	\N	2023-09-01 00:00:00+07	2023-09-01 00:00:00+07	16	15
66	3	\N	2025-01-01 00:00:00+07	2025-01-01 00:00:00+07	22	15
67	1	\N	2023-05-01 00:00:00+07	2023-05-01 00:00:00+07	7	20
68	2	\N	2023-12-01 00:00:00+07	2023-12-01 00:00:00+07	14	20
69	1	\N	2023-08-01 00:00:00+07	2023-08-01 00:00:00+07	6	25
70	2	\N	2024-02-01 00:00:00+07	2024-02-01 00:00:00+07	13	25
\.


--
-- Data for Name: tbl_jabatan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_jabatan (id, jabatan, created_at, updated_at) FROM stdin;
1	Vice President	2025-07-17 08:25:07.81784+07	\N
2	Manager	2025-07-17 08:25:07.81784+07	\N
3	Asisten Manager	2025-07-17 08:25:07.81784+07	\N
4	Staff	2025-07-17 08:25:07.81784+07	\N
5	Tenaga Alih Daya (TAD)	2025-07-17 08:25:07.81784+07	\N
7	Direktur	2024-01-01 08:00:00+07	2024-01-01 08:00:00+07
\.


--
-- Data for Name: tbl_kategori; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_kategori (id, kategori, created_at, updated_at, icon_light, icon_dark) FROM stdin;
2	Analyticts	2025-07-29 09:15:56.987+07	\N	\N	\N
3	Enterprise Software	2025-07-29 09:15:56.987+07	\N	\N	\N
4	Security	2025-07-29 09:15:56.987+07	\N	\N	\N
5	Energy	2025-07-29 09:15:56.987+07	\N	\N	\N
1	Infrastructure	2025-07-29 09:15:56.987+07	2025-07-29 09:45:10.935475+07	kategori_light_1753757106460.png	kategori_dark_1753755576616.png
\.


--
-- Data for Name: tbl_license_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_license_notifications (id, license_id, notification_type, notification_date, is_sent, sent_at, created_at) FROM stdin;
1	37	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
2	38	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
3	41	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
4	42	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
5	44	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
6	51	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
7	52	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
8	53	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
9	54	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
10	55	expired	2025-08-12	f	\N	2025-08-12 17:35:36.624974
\.


--
-- Data for Name: tbl_mon_crjr; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_mon_crjr (id, id_produk, tipe_pekerjaan, tanggal_mulai, tanggal_akhir, version, deskripsi, status, progress, pic, priority, created_at, updated_at) FROM stdin;
2	11	CR	2025-08-14	2025-08-14	0.96		DATA BARU/HILANG	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
3	1	CR	2025-08-14	2025-08-14	0.76		DATA BARU/HILANG	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
4	1	CR	2025-08-14	2025-08-14	1.01		DATA BARU/HILANG	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
5	1	CR	2025-08-14	2025-08-14	0.96		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
6	1	CR	2025-08-14	2025-08-14	1.01		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
7	1	CR	2025-08-14	2025-08-14	1.01		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
8	23	CR	2025-08-14	2025-08-14	0.96		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
9	62	CR	2025-08-14	2025-08-14	1.01		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
10	1	CR	2025-08-14	2025-08-14	0.34		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
11	46	CR	2025-08-14	2025-08-14	0.34		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
12	52	CR	2025-08-14	2025-08-14	1.01		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
13	60	CR	2025-08-14	2025-08-14	0.34		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
14	74	CR	2025-08-14	2025-08-14	0.34		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
15	20	CR	2025-08-14	2025-08-14	0.11		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
16	13	JR	2025-08-14	2025-08-14	0.11		DATA BARU/HILANG	0	nan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
17	183	CR	2025-08-14	2025-08-14	0.11		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
18	1	CR	2025-08-14	2025-08-14	0.11		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
19	20	CR	2025-08-14	2025-08-14	0.11		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
20	1	CR	2025-08-14	2025-08-14	0.12		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
21	38	CR	2025-08-14	2025-08-14	0.11		DATA BARU/HILANG	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
22	187	CR	2025-08-14	2025-08-14	nan		nan	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
23	188	CR	2025-08-14	2025-08-14	nan		nan	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
24	77	CR	2025-08-14	2025-08-14	nan		nan	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
25	189	CR	2025-08-14	2025-08-14	nan		nan	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
26	190	CR	2025-08-14	2025-08-14	NaT		NaT	0	NaT	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
27	191	CR	2025-08-14	2025-08-14	NaT		NaT	0	NaT	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
28	192	CR	2025-08-14	2025-08-14	nan		nan	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
29	79	CR	2025-08-14	2025-08-14	0.9		DATA BARU/HILANG	0	Nurkholis Ari Sugarto	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
30	15	JR	2025-08-14	2025-08-14	nan		DATA BARU/HILANG	0	Nurkholis Ari Sugarto	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
31	15	CR	2025-08-14	2025-08-14	nan		DATA BARU/HILANG	0	Nurkholis Ari Sugarto	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
32	193	CR	2025-08-14	2025-08-14	NaT		NaT	0	NaT	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
33	194	CR	2025-08-14	2025-08-14	nan		nan	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
34	195	CR	2025-08-14	2025-08-14	nan		nan	0	Arief yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
35	196	CR	2025-08-14	2025-08-14	nan		nan	0	Arief yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
36	77	CR	2025-08-14	2025-08-14	nan		nan	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
37	197	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
38	164	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
39	99	CR	2025-08-14	2025-08-14			Pending	0	Gumilar Sulistiawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
40	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
41	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
42	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
43	127	CR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
44	127	CR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
45	120	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
46	118	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
47	118	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
48	163	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
49	128	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
50	111	CR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
51	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
52	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
53	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
54	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
55	153	JR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
56	107	CR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
57	111	CR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
58	19	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
59	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
60	86	SR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
61	47	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
62	47	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
63	1	JR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
64	71	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
65	69	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
66	183	JR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
67	183	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
68	24	SR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
69	24	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
70	40	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
71	12	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
72	12	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
73	65	JR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
74	38	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
75	198	CR	2025-08-14	2025-08-14			Pending	0	Nurkholis Ari Sugarto	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
76	15	JR	2025-08-14	2025-08-14			Pending	0	Nurkholis Ari Sugarto	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
77	199	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
78	33	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
79	200	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
80	74	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
81	201	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
82	1	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
83	1	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
84	40	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
85	60	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
86	40	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
87	38	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
88	202	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
89	46	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
90	11	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
91	1	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
92	44	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
93	38	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
94	56	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
95	180	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
96	83	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
97	180	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
98	83	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
99	11	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
100	1	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
101	1	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
102	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
103	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
104	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
105	23	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
106	62	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
107	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
108	51	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
109	46	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
110	52	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
111	60	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
112	74	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
113	170	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
114	203	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
115	20	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
116	13	JR	2025-08-14	2025-08-14			Pending	0	nan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
117	183	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
118	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
119	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
120	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
121	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
122	204	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
123	204	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
124	20	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
125	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
126	38	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
127	189	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
128	45	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
129	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
130	180	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
131	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
132	59	JR	2025-08-14	2025-08-14			Pending	0	nan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
133	71	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
134	44	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
135	1	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
136	62	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
137	205	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
138	83	SR	2025-08-14	2025-08-14			Pending	0	nan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
139	137	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
140	20	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
141	83	SR	2025-08-14	2025-08-14			Pending	0	nan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
142	85	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
143	206	CR	2025-08-14	2025-08-14			Pending	0	NaT	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
144	207	CR	2025-08-14	2025-08-14			Pending	0	NaT	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
145	208	CR	2025-08-14	2025-08-14			Pending	0	NaT	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
146	79	CR	2025-08-14	2025-08-14			Pending	0	Nurkholis Ari Sugarto	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
147	15	JR	2025-08-14	2025-08-14			Pending	0	Nurkholis Ari Sugarto	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
148	15	CR	2025-08-14	2025-08-14			Pending	0	Nurkholis Ari Sugarto	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
149	209	CR	2025-08-14	2025-08-14			Pending	0	NaT	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
150	210	CR	2025-08-14	2025-08-14			Pending	0	NaT	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
151	48	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
152	211	CR	2025-08-14	2025-08-14			Pending	0	Arief yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
153	212	CR	2025-08-14	2025-08-14	nan		nan	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
154	11	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
155	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
156	86	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
157	86	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
158	47	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
159	47	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
160	46	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
161	46	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
162	46	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
163	46	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
164	46	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
165	46	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
166	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
167	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
168	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
169	1	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
170	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
171	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
172	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
173	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
174	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
175	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
176	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
177	74	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
178	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
179	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
180	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
181	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
182	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
183	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
184	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
185	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
186	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
187	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
188	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
189	1	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
190	1	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
191	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
192	1	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
193	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
194	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
195	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
196	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
197	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
198	1	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
199	1	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
200	6	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
201	71	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
202	71	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
203	71	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
204	213	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
205	5	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
206	69	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
207	2	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
208	84	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
209	183	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
210	183	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
211	86	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
212	24	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
213	27	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
214	24	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
215	24	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
216	24	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
217	24	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
218	24	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
219	40	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
220	40	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
221	214	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
222	12	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
223	12	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
224	12	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
225	215	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
226	65	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
227	87	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
228	180	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
229	180	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
230	180	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
231	180	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
232	180	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
233	9	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
234	38	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
235	38	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
236	198	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
237	25	SR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
238	15	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	?	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
239	205	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
240	199	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
241	33	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
242	83	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
243	25	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
244	25	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
245	59	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	?	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
246	25	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
247	200	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
248	74	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
249	59	JR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	?	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
250	201	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
251	201	CR	2025-08-14	2025-08-14	0.0		SELESAI/DEPLOY	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
252	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
253	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
254	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
255	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
256	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
257	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
258	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
259	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
260	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
261	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
262	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
263	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
264	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
265	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
266	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
267	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
268	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
269	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
270	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
271	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
272	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
273	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
274	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
275	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
276	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
277	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
278	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
279	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
280	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
281	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
282	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
283	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
284	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
285	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
286	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
287	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
288	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
289	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
290	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
291	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
292	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
293	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
294	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
295	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
296	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
297	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
298	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
299	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
300	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
301	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
302	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
303	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
304	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
305	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
306	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
307	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
308	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
309	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
310	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
311	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
312	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
313	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
314	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
315	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
316	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
317	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
318	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
319	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
320	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
321	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
322	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
323	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
324	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
325	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
326	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
327	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
328	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
329	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
330	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
331	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
332	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
333	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
334	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
335	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
336	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
337	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
338	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
339	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
340	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
341	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
342	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
343	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
344	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
345	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
346	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
347	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
348	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
349	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
350	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
351	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
352	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
353	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
354	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
355	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
356	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
357	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
358	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
359	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
360	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
361	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
362	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
363	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
364	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
365	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
366	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
367	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
368	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
369	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
370	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
371	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
372	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
373	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
374	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
375	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
376	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
377	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
378	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
379	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
380	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
381	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
382	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
383	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
384	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
385	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
386	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
387	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
388	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
389	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
390	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
391	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
392	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
393	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
394	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
395	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
396	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
397	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
398	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
399	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
400	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
401	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
402	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
403	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
404	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
405	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
406	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
407	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
408	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
409	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
410	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
411	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
412	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
413	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
414	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
415	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
416	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
417	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
418	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
419	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
420	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
421	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
422	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
423	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
424	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
425	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
426	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
427	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
428	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
429	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
430	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
431	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
432	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
433	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
434	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
435	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
436	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
437	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
438	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
439	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
440	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
441	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
442	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
443	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
444	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
445	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
446	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
447	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
448	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
449	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
450	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
451	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
452	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
453	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
454	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
455	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
456	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
457	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
458	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
459	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
460	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
461	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
462	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
463	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
464	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
465	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
466	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
467	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
468	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
469	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
470	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
471	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
472	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
473	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
474	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
475	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
476	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
477	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
478	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
479	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
480	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
481	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
482	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
483	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
484	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
485	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
486	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
487	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
488	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
489	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
490	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
491	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
492	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
493	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
494	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
495	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
496	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
497	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
498	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
499	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
500	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
501	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
502	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
503	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
504	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
505	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
506	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
507	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
508	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
509	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
510	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
511	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
512	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
513	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
514	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
515	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
516	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
517	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
518	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
519	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
520	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
521	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
522	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
523	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
524	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
525	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
526	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
527	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
528	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
529	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
530	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
531	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
532	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
533	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
534	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
535	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
536	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
537	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
538	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
539	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
540	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
541	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
542	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
543	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
544	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
545	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
546	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
547	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
548	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
549	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
550	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
551	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
552	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
553	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
554	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
555	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
556	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
557	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
558	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
559	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
560	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
561	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
562	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
563	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
564	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
565	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
566	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
567	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
568	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
569	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
570	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
571	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
572	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
573	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
574	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
575	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
576	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
577	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
578	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
579	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
580	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
581	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
582	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
583	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
584	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
585	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
586	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
587	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
588	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
589	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
590	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
591	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
592	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
593	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
594	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
595	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
596	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
597	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
598	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
599	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
600	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
601	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
602	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
603	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
604	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
605	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
606	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
607	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
608	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
609	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
610	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
611	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
612	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
613	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
614	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
615	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
616	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
617	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
618	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
619	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
620	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
621	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
622	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
623	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
624	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
625	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
626	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
627	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
628	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
629	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
630	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
631	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
632	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
633	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
634	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
635	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
636	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
637	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
638	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
639	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
640	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
641	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
642	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
643	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
644	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
645	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
646	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
647	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
648	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
649	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
650	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
651	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
652	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
653	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
654	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
655	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
656	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
657	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
658	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
659	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
660	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
661	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
662	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
663	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
664	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
665	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
666	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
667	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
668	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
669	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
670	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
671	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
672	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
673	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
674	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
675	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
676	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
677	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
678	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
679	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
680	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
681	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
682	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
683	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
684	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
685	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
686	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
687	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
688	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
689	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
690	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
691	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
692	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
693	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
694	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
695	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
696	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
697	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
698	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
699	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
700	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
701	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
702	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
703	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
704	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
705	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
706	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
707	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
708	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
709	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
710	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
711	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
712	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
713	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
714	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
715	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
716	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
717	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
718	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
719	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
720	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
721	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
722	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
723	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
724	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
725	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
726	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
727	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
728	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
729	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
730	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
731	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
732	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
733	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
734	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
735	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
736	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
737	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
738	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
739	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
740	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
741	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
742	151	CR	2025-08-14	2025-08-14		nan	Pending	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
743	151	CR	2025-08-14	2025-08-14		NO	Pending	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
744	151	CR	2025-08-14	2025-08-14		130	Pending	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
745	152	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
746	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
747	153	JR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
748	105	JR	2025-08-14	2025-08-14			Pending	0	Nur Agus Assary	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
749	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
750	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
751	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
752	154	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
753	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
754	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
755	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
756	155	JR	2025-08-14	2025-08-14			Pending	0	Gumilar Sulistiawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
757	120	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
758	120	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
759	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
760	154	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
761	154	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
762	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
763	154	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
764	156	JR	2025-08-14	2025-08-14			Pending	0	Gumilar Sulistiawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
765	157	JR	2025-08-14	2025-08-14			Pending	0	Gumilar Sulistiawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
766	158	JR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
767	154	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
768	159	JR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
769	160	JR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
770	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
771	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
772	161	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
773	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
774	118	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
775	162	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
776	105	JR	2025-08-14	2025-08-14			Pending	0	Nur Agus Assary	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
777	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
778	154	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
779	127	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
780	93	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
781	100	CR	2025-08-14	2025-08-14			Pending	0	Gumilar Sulistiawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
782	118	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
783	127	CR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
784	118	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
785	127	CR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
786	120	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
787	118	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
788	163	CR	2025-08-14	2025-08-14			Pending	0	Oman Rohman	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
789	164	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
790	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
791	104	CR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
792	99	CR	2025-08-14	2025-08-14			Pending	0	Gumilar Sulistiawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
793	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
794	111	CR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
795	128	JR	2025-08-14	2025-08-14			Pending	0	Agung Widyo	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
796	90	CR	2025-08-14	2025-08-14			Pending	0	Wachyu Setiono	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
797	113	JR	2025-08-14	2025-08-14			Pending	0	Bayu Bagus	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
798	165	CR	2025-08-14	2025-08-14			Pending	0	Nur Agus Assary	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
799	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
800	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
801	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
802	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
803	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
804	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
805	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
806	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
807	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
808	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
809	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
810	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
811	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
812	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
813	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
814	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
815	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
816	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
817	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
818	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
819	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
820	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
821	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
822	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
823	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
824	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
825	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
826	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
827	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
828	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
829	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
830	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
831	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
832	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
833	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
834	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
835	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
836	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
837	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
838	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
839	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
840	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
841	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
842	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
843	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
844	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
845	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
846	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
847	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
848	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
849	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
850	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
851	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
852	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
853	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
854	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
855	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
856	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
857	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
858	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
859	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
860	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
861	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
862	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
863	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
864	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
865	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
866	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
867	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
868	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
869	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
870	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
871	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
872	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
873	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
874	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
875	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
876	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
877	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
878	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
879	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
880	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
881	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
882	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
883	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
884	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
885	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
886	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
887	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
888	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
889	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
890	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
891	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
892	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
893	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
894	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
895	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
896	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
897	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
898	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
899	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
900	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
901	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
902	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
903	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
904	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
905	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
906	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
907	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
908	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
909	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
910	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
911	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
912	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
913	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
914	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
915	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
916	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
917	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
918	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
919	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
920	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
921	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
922	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
923	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
924	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
925	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
926	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
927	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
928	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
929	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
930	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
931	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
932	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
933	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
934	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
935	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
936	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
937	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
938	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
939	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
940	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
941	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
942	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
943	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
944	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
945	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
946	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
947	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
948	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
949	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
950	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
951	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
952	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
953	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
954	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
955	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
956	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
957	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
958	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
959	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
960	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
961	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
962	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
963	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
964	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
965	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
966	151	CR	2025-08-14	2025-08-14			QA INTERNAL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
967	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
968	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
969	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
970	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
971	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
972	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
973	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
974	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
975	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
976	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
977	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
978	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
979	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
980	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
981	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
982	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
983	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
984	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
985	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
986	151	CR	2025-08-14	2025-08-14			REQ	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
987	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
988	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
989	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
990	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
991	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
992	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
993	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
994	166	CR	2025-08-14	2025-08-14			Pending	0	nan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
995	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
996	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
997	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
998	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
999	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1000	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1001	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1002	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1003	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1004	167	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1005	168	JR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1006	169	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1007	169	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1008	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1009	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1010	170	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1011	170	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1012	170	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1013	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1014	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1015	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1016	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1017	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1018	170	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1019	170	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1020	170	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1021	170	JR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	High	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1022	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1023	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1024	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1025	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1026	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1027	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1028	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1029	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1030	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1031	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1032	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1033	170	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1034	171	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1035	172	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1036	173	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1037	174	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1038	175	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1039	176	CR	2025-08-14	2025-08-14			Pending	0	Nurkholis	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1040	177	CR	2025-08-14	2025-08-14			Pending	0	Dodik Gunawan	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1041	56	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1042	178	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1043	178	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1044	178	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1045	178	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1046	178	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1047	178	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1048	178	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1049	71	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1050	71	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1051	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1052	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1053	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1054	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1055	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1056	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1057	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1058	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1059	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1060	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1061	86	CR	2025-08-14	2025-08-14			Pending	0	Arief Yanuar	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1062	44	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1063	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1064	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1065	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1066	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1067	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1068	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1069	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1070	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1071	179	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1072	180	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1073	181	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1074	181	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1075	181	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1076	181	CR	2025-08-14	2025-08-14			Pending	0	Christland Simatupang	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1077	100	CR	2025-08-14	2025-08-14			Pending	0	Weni Levin R Blegur	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1078	127	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1079	127	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1080	127	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1081	127	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1082	127	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1083	153	CR	2025-08-14	2025-08-14			Pending	0	Hera E Amban	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1084	153	CR	2025-08-14	2025-08-14			Pending	0	Hera E Amban	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1085	105	CR	2025-08-14	2025-08-14			Pending	0	Hera E Amban	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1086	158	CR	2025-08-14	2025-08-14			Pending	0	Hera E Amban	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1087	127	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1088	127	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1089	127	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1090	118	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1091	118	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1092	118	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1093	118	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1094	118	CR	2025-08-14	2025-08-14			Pending	0	Satrio Purwosunu	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1095	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1096	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1097	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1098	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1099	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1100	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1101	151	CR	2025-08-14	2025-08-14			SIAP UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1102	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1103	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1104	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1105	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1106	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1107	151	CR	2025-08-14	2025-08-14			BARU	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1108	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1109	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1110	151	CR	2025-08-14	2025-08-14			DEV	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1111	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1112	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1113	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1114	151	CR	2025-08-14	2025-08-14			SIAP DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1115	151	CR	2025-08-14	2025-08-14			DEPLOY	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1116	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1117	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1118	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1119	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1120	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1121	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1122	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1123	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1124	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1125	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1126	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1127	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1128	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1129	151	CR	2025-08-14	2025-08-14			REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1130	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1131	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1132	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1133	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1134	151	CR	2025-08-14	2025-08-14			REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1135	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1136	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1137	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1138	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1139	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1140	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1141	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1142	151	CR	2025-08-14	2025-08-14			BELUM REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1143	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1144	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1145	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1146	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1147	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1148	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1149	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1150	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1151	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1152	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1153	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1154	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1155	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1156	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1157	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1158	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1159	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1160	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1161	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1162	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1163	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1164	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1165	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1166	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1167	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1168	151	CR	2025-08-14	2025-08-14			UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1169	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1170	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1171	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1172	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1173	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1174	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1175	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1176	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1177	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1178	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1179	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1180	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1181	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1182	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1183	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1184	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1185	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1186	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1187	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1188	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1189	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1190	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1191	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1192	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1193	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1194	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1195	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1196	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1197	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1198	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1199	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1200	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1201	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1202	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1203	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1204	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1205	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1206	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1207	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1208	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1209	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1210	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1211	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1212	151	CR	2025-08-14	2025-08-14			UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1213	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1214	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1215	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1216	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1217	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1218	151	CR	2025-08-14	2025-08-14			CANCEL	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1219	151	CR	2025-08-14	2025-08-14			CR CLOSED	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1220	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1221	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1222	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1223	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1224	151	CR	2025-08-14	2025-08-14			UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1225	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1226	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1227	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1228	151	CR	2025-08-14	2025-08-14			BELUM REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1229	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1230	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1231	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1232	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1233	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1234	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1235	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1236	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1237	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1238	151	CR	2025-08-14	2025-08-14			REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1239	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1240	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1241	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1242	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1243	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1244	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1245	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1246	151	CR	2025-08-14	2025-08-14			BELUM REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1247	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1248	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1249	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1250	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1251	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1252	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1253	151	CR	2025-08-14	2025-08-14			UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1254	151	CR	2025-08-14	2025-08-14			UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1255	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1256	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1257	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1258	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1259	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1260	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1261	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1262	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1263	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1264	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1265	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1266	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1267	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1268	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1269	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1270	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1271	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1272	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1273	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1274	151	CR	2025-08-14	2025-08-14			REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1275	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1276	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1277	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1278	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1279	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1280	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1281	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1282	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1283	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1284	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1285	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1286	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1287	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1288	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1289	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1290	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1291	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1292	151	CR	2025-08-14	2025-08-14			CR CLOSED	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1293	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1294	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1295	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1296	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1297	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1298	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1299	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1300	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1301	151	CR	2025-08-14	2025-08-14			UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1302	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1303	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1304	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1305	151	CR	2025-08-14	2025-08-14			UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1306	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1307	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1308	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1309	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1310	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1311	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1312	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1313	151	CR	2025-08-14	2025-08-14			BELUM REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1314	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1315	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1316	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1317	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1318	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1319	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1320	151	CR	2025-08-14	2025-08-14			UAT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1321	151	CR	2025-08-14	2025-08-14			DEVELOPMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1322	151	CR	2025-08-14	2025-08-14			DEPLOYMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1323	151	CR	2025-08-14	2025-08-14			BELUM REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1324	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1325	151	CR	2025-08-14	2025-08-14			nan	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
1326	151	CR	2025-08-14	2025-08-14			BELUM REQUIREMENT	0	TBD	Medium	2025-08-14 16:33:04.340821+07	2025-08-14 16:33:04.340821+07
\.


--
-- Data for Name: tbl_mon_licenses; Type: TABLE DATA; Schema: public; Owner: jmaharyuda
--

COPY public.tbl_mon_licenses (id, no_urut, nama_aplikasi, bpo, jenis_lisensi, jumlah, harga_satuan, harga_total, periode_po, kontrak_layanan_bulan, start_layanan, akhir_layanan, metode, keterangan_akun, tanggal_aktivasi, tanggal_pembaharuan, status, created_at, updated_at, selling_price, purchase_price_per_unit, total_purchase_price, total_selling_price) FROM stdin;
43	19	Figma	MDG	Subscription License	10	9367974.00	93679740.00	12	12	2024-10-01	2025-10-01	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:29.291222	0.00	9367974.00	93679740.00	0.00
44	20	Adobe Premiere	\N	Subscription License	\N	46932800.00	0.00	12	12	2024-08-01	2025-08-01	SPR	\N	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 17:56:33.963507	0.00	46932800.00	0.00	\N
45	21	Turboscribe Unlimited	TCO	Subscription License	1	2450880.00	2450880.00	12	12	2024-12-03	2025-12-03	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:39.499856	0.00	2450880.00	2450880.00	0.00
46	22	Veed Pro	TCO	Subscription License	1	5882112.00	5882112.00	12	12	2024-12-03	2025-12-03	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:41.324455	0.00	5882112.00	5882112.00	0.00
47	23	ElevenLabs Creator	TCO	Subscription License	1	4534128.00	4534128.00	12	12	2024-12-03	2025-12-03	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:43.544179	0.00	4534128.00	4534128.00	0.00
48	24	Canva Pro	TCO	Subscription License	1	981629.00	981629.00	12	12	2024-12-31	2025-12-31	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:45.325397	0.00	981629.00	981629.00	0.00
49	25	Freepik Premium	TCO	Subscription License	1	3644352.00	3644352.00	12	12	2024-12-03	2025-12-03	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:46.74014	0.00	3644352.00	3644352.00	0.00
25	1	Oracle Crystal Ball 1	STI	Perpetual License	8	17196754.00	137574032.00	12	9999999	2024-07-10	9999-12-31	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:55:29.581424	0.00	17196754.00	137574032.00	0.00
26	2	Oracle Crystal Ball 2	STI	Perpetual License	10	17196754.00	171967540.00	12	9999999	2024-10-24	9999-12-31	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:55:35.181618	0.00	17196754.00	171967540.00	0.00
27	3	Trading economic	STI	Subscription License	1	3699.00	59139993.00	12	12	2025-07-09	2026-07-09	SPR	riskcontrolcenterpln@gmail.com	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:55:48.496925	0.00	3699.00	59139993.00	0.00
28	4	MarineTraffic	STI	Subscription License	1	357000000.00	357000000.00	12	12	2025-04-26	2026-04-26	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:55:50.799527	0.00	357000000.00	357000000.00	0.00
29	5	Tiny MCE	STI	Subscription License	1	815000000.00	815000000.00	12	12	2024-10-07	2025-10-07	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:55:52.759952	0.00	815000000.00	815000000.00	0.00
30	6	ChatGPT	Direksi	Subscription License	10	46932800.00	469328000.00	12	12	2024-11-01	2025-11-01	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:55:54.375214	0.00	46932800.00	469328000.00	0.00
31	7	ChatGPT	TCO	Subscription License	2	600.00	18840000.00	12	12	2024-10-01	2025-10-01	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:55:56.750569	0.00	600.00	18840000.00	0.00
32	8	IlovePDF	TCO	Subscription License	1	292800.00	292800.00	12	12	2024-09-30	2025-09-30	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:00.83486	0.00	292800.00	292800.00	0.00
33	9	ODDO	BAg	Subscription License	1	163200000.00	163200000.00	12	12	2024-09-14	2025-09-14	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:05.828024	0.00	163200000.00	163200000.00	0.00
34	10	Jira	internal	Subscription License	1	68500000.00	68500000.00	12	12	2024-09-14	2025-09-14	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:08.053422	0.00	68500000.00	68500000.00	0.00
35	11	3Dholphins Live Chat	PLN Kita/STI	Subscription License	1	350000000.00	350000000.00	12	12	2024-10-27	2025-10-27	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:13.677433	0.00	350000000.00	350000000.00	0.00
36	12	3Dholphins Chat Bot	PLN MOBILE/STI	Subscription License	\N	\N	\N	\N	\N	\N	9999-12-31	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:15.874575	0.00	\N	\N	\N
37	13	Stata	STI	Subscription License	1	45450000.00	45450000.00	12	12	2023-12-17	2024-12-17	SPP	\N	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 17:56:18.526519	0.00	45450000.00	45450000.00	0.00
38	14	Maximo Application Suite (MAS 8)	STI	Subscription License	\N	\N	0.00	12	12	2024-08-01	2025-08-01	SPP	\N	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 17:56:20.316448	0.00	\N	0.00	\N
39	15	Craft & LME	STI	Subscription License	1	598800000.00	598800000.00	12	12	2024-11-08	2025-11-08	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:22.450748	0.00	598800000.00	598800000.00	0.00
40	16	Filenet & Datacap	STI	Subscription License	1	605921000.00	605921000.00	12	12	2024-12-31	2025-12-31	SPP	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:24.603909	0.00	605921000.00	605921000.00	0.00
41	17	Google Drive 1	TCO	Subscription License	1	1320900.00	1320900.00	12	12	2024-08-01	2025-08-01	SPR	narasi PLN	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 17:56:25.978296	0.00	1320900.00	1320900.00	0.00
42	18	Google Drive 2	TCO	Subscription License	1	2067930.00	2067930.00	12	12	2024-08-01	2025-08-01	SPR	Komtranspln	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 17:56:27.793018	0.00	2067930.00	2067930.00	0.00
56	32	ArcGIS	STI	\N	\N	\N	\N	\N	\N	\N	9999-12-31	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:35:02.410828	0.00	\N	\N	\N
50	26	ThinkCell	DIV GA	Subscription License	4	24516900.00	24516900.00	12	12	2025-01-31	2026-01-31	SPR	\N	\N	\N	Active	2025-08-12 17:18:31.267331	2025-08-12 17:56:47.925491	0.00	24516900.00	24516900.00	0.00
51	27	Capcut	TCO	Subscription License	1	1108890.00	1108890.00	12	12	2023-12-20	2024-12-20	SPR	\N	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 17:56:49.684941	0.00	1108890.00	1108890.00	0.00
52	28	Video Downloader - Story Saver	TCO	Subscription License	1	387390.00	387390.00	12	12	2023-12-20	2024-12-20	SPR	\N	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 18:03:47.202304	0.00	387390.00	387390.00	0.00
53	29	Wondershare Filmora	TCO	Subscription License	1	775097.00	775097.00	12	12	2023-12-20	2024-12-20	SPR	\N	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 18:03:49.210148	0.00	775097.00	775097.00	0.00
54	30	WARP : Safer Internet	TCO	Subscription License	1	186480.00	186480.00	12	12	2023-12-15	2024-12-15	SPR	\N	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 18:03:50.67961	0.00	186480.00	186480.00	0.00
55	31	Wondershare PDF Element	TCO	Subscription License	1	1461968.00	1461968.00	12	12	2023-12-22	2024-12-22	SPR	\N	\N	\N	Expired	2025-08-12 17:18:31.267331	2025-08-12 18:03:52.059754	0.00	1461968.00	1461968.00	0.00
\.


--
-- Data for Name: tbl_produk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_produk (id, produk, deskripsi, id_kategori, id_segmen, id_stage, harga, tanggal_launch, pelanggan, created_at, updated_at, tanggal_stage_end, tanggal_stage_start) FROM stdin;
1	AP2T	Deskripsi produk contoh	3	5	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-12	2024-10-21
2	CRM		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-23	2024-11-08
3	Aplikasi Subsidi DJK		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-07-02	2024-06-28
4	EPSO		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2025-01-11	2024-12-21
5	BPBL		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-07-19	2024-07-17
6	AP3T		3	5	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-21	2024-12-04
7	Digitail		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-13	2024-03-06
8	PLTS Atap		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-07-23	2024-07-17
9	P2APST		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-07	2024-02-14
10	ARENA		3	3	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-23	2024-08-17
11	ACMT		3	3	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-26	2024-03-19
12	FSO		3	5	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-29	2024-10-25
13	New ITO		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-01-28	2024-01-02
14	Charge IN		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-24	2024-09-09
15	PLN Mobile		3	5	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-27	2024-08-28
16	ESDS		3	5	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-13	2024-12-09
17	Chempion		3	4	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-14	2024-05-13
18	Checkmate		3	4	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-18	2024-07-23
19	ChesKP		3	4	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-11	2024-08-18
20	Web Portal Pelanggan		3	5	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-15	2024-02-12
21	PLN for Business		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-04	2024-11-07
22	AP2T PLN Batam		3	5	2	100000	1970-01-01	PLN Batam	2025-08-05 09:02:39.090486+07	\N	2024-05-19	2024-05-01
23	CRM Bag		3	4	1	100000	1970-01-01	BAg	2025-08-05 09:02:39.090486+07	\N	2024-10-05	2024-09-17
24	E-PROC		3	4	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-05	2024-03-07
25	SMAR		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-17	2024-05-06
26	AVANGER		3	4	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-02	2024-07-11
27	DIGIPROC		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-26	2024-09-22
28	VMS (Vendor Management System)		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2025-01-01	2024-12-10
29	e-Procurement BAG		3	4	1	100000	1970-01-01	BAg	2025-08-05 09:02:39.090486+07	\N	2024-03-25	2024-02-25
30	Smartproc PLN EG		3	4	4	100000	1970-01-01	EG	2025-08-05 09:02:39.090486+07	\N	2024-05-05	2024-05-01
31	Aplikasi HXMS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-20	2024-04-28
32	Aplikasi Rekrutment dan Seleksi		3	4	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-06-04	2024-05-18
33	SAP SF PMGM		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-24	2024-02-03
34	PLN Click		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-19	2024-02-20
35	HSSE Mobile		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-28	2024-09-26
36	Aplikasi ECC		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-13	2024-11-28
37	Aplikasi PMGM		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-19	2024-02-09
38	PLN Daily		3	4	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-23	2024-02-16
39	BAg Daily		3	4	1	100000	1970-01-01	BAg	2025-08-05 09:02:39.090486+07	\N	2024-03-02	2024-02-25
40	E-SPPD		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-23	2024-03-08
41	DMS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-12	2024-04-02
42	E-Arsip		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-17	2024-09-30
43	E-Meeting		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-06-24	2024-05-31
44	E-Transport		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-01-12	2024-01-07
45	ITEMS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-24	2024-12-03
46	AMS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-29	2024-04-13
47	AIR TAX		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-08	2024-02-06
48	Aplikasi Centralized Payment untuk Vendor Invoicing Portal (VIP)		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-13	2024-03-29
49	SIMLOAN		3	4	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-22	2024-08-01
50	Aplikasi E-Budget		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-25	2024-09-15
51	FIX		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-06-15	2024-05-31
52	PLN FIT		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-01	2024-08-29
53	SAP FM		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-27	2024-08-31
54	ERP Financial Management (FM)		3	4	1	100000	1970-01-01	BAg	2025-08-05 09:02:39.090486+07	\N	2024-11-13	2024-10-21
55	Maxico EPI		3	4	2	100000	1970-01-01	EPI	2025-08-05 09:02:39.090486+07	\N	2024-02-14	2024-01-29
56	SPIN/ICOFR		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-15	2024-03-07
57	Aplikasi COS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-12	2024-11-10
58	Aplikasi Komando		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-13	2024-09-11
59	ERBAS (SPI)		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-20	2024-11-07
60	SMARTER		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-16	2024-08-22
61	Aplikasi Fraud Risk Assesment (FRA)		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-13	2024-08-28
62	Aplikasi Daily Activity Management System (DAMS)		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-06	2024-02-01
63	Aplikasi Good Corporate Governance (GCG)		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-26	2024-04-04
64	Aplikasi SDTHKK		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-26	2024-05-12
65	LIS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-19	2024-11-06
66	IT Service Management (ITSM)		3	4	2	100000	1970-01-01	BAg	2025-08-05 09:02:39.090486+07	\N	2024-07-04	2024-06-23
67	Executive Dashboard		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-30	2024-11-16
68	Aplikasi Biaya Pokok Produksi (BPP)		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-08	2024-01-16
69	CCTR SYSTEM		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-18	2024-04-20
70	VCC		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-04	2024-11-23
71	APKT		3	5	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-07-28	2024-07-14
72	APKT MOBILE		3	5	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-31	2024-05-21
73	EBID DOC		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-22	2024-11-25
74	Web Korporat PLN		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-17	2024-03-03
75	Aplikasi IAM		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-12	2024-09-04
76	Web IET		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-27	2024-09-10
77	New Virtual Cubicle		3	4	2	100000	1970-01-01	PLN Enjiniring	2025-08-05 09:02:39.090486+07	\N	2024-08-29	2024-07-30
78	RPA/ EPIMATES		3	4	1	100000	1970-01-01	EPI	2025-08-05 09:02:39.090486+07	\N	2024-05-12	2024-05-07
79	Portal Setper		3	4	2	100000	1970-01-01	EPI	2025-08-05 09:02:39.090486+07	\N	2024-09-21	2024-08-30
80	IPMS (Integrated Payment Management System)		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-07	2024-04-05
81	HCIS PLN EG		3	4	1	100000	1970-01-01	Energi Gas	2025-08-05 09:02:39.090486+07	\N	2024-05-30	2024-05-22
82	Smartproc		3	4	2	100000	1970-01-01	Energi Gas	2025-08-05 09:02:39.090486+07	\N	2025-01-06	2024-12-28
83	Aplikasi SILM		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-29	2024-02-14
84	CSMS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-24	2024-11-27
85	Aplikasi Inspekta		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-18	2024-04-25
86	AGO		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-09	2024-11-04
87	MIMS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-24	2024-12-04
88	Planned Maintenance System (PMS)		3	4	2	100000	1970-01-01	BAg	2025-08-05 09:02:39.090486+07	\N	2024-07-04	2024-06-08
89	ERP Material Management (MM)		3	4	2	100000	1970-01-01	BAg	2025-08-05 09:02:39.090486+07	\N	2024-11-19	2024-11-18
90	BBO		3	1	3	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-01-19	2024-01-16
91	GBMO		3	1	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-06	2024-07-20
92	SI IPP		3	1	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-27	2024-12-13
93	MAPP Power		3	1	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-09	2024-10-08
94	EAM PEMBANGKIT		3	1	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-06-11	2024-06-04
95	ISDS		3	1	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-27	2024-12-08
96	Aplikasi Climate Click		3	1	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-24	2024-11-16
97	Digital Logsheet TJB		3	1	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2025-01-08	2024-12-26
98	IoT Pembangkit		3	1	2	100000	1970-01-01	PLN ND & PLN BATAM	2025-08-05 09:02:39.090486+07	\N	2024-12-18	2024-11-21
99	AVMX		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-07-05	2024-06-07
100	Valiant		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-06	2024-04-08
101	e - Logsheet		3	1	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-20	2024-09-25
102	Fuel Monitoring System (FMS)		3	1	2	100000	1970-01-01	BAg	2025-08-05 09:02:39.090486+07	\N	2024-09-30	2024-09-27
103	Biomassa		3	1	2	100000	1970-01-01	EPI	2025-08-05 09:02:39.090486+07	\N	2024-08-28	2024-08-09
104	EAM TRANSMISI		3	2	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-09	2024-02-13
105	New Srintami		3	2	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-07-04	2024-06-06
106	Jalur		3	2	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-02	2024-08-16
107	FOIS		3	2	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-06-02	2024-05-17
108	Aplikasi Kinerja Fasop		3	2	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-08	2024-04-14
109	New PST		3	2	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-12	2024-03-29
110	TFA		3	2	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-27	2024-02-14
111	Power Inspect		3	2	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2025-01-24	2024-12-25
112	Tower ERS (Monster)		3	2	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-09	2024-10-19
113	Georensis		3	2	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-28	2024-07-30
114	AMR		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-25	2024-07-31
115	F12RB MMNE P2B Jawa Bali		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-17	2024-09-18
116	F12RB NEON P2B UIKL Sulawesi		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-31	2024-12-16
117	F12RB MMNE P3B Sumatera		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-11	2024-03-30
118	MDMS		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-20	2024-05-09
119	INFRA MDMS		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-08	2024-03-18
120	Portal SCADA		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-05	2024-01-29
121	GRITA		3	3	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-29	2024-11-20
122	Smart Microgrid		3	3	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-29	2024-04-25
123	PLN Smart DVM		3	3	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-01-05	2024-01-04
124	NEON		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-06-09	2024-05-17
125	Online Monitoring Performance		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-19	2024-04-30
126	Online Monitoring Losses UPK Bangka		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-26	2024-09-06
127	EAM Distribusi		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-13	2024-09-14
128	New Dreamobile		3	3	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-19	2024-08-02
129	Head End System (HES)		3	3	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-24	2024-02-22
130	Monitoring Program Transformasi (MOTION) PMO		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-17	2024-04-02
131	Aplikasi Monitoring Program Transformasi (MOTION) TCO		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-02-19	2024-02-15
132	Aplikasi PMO dan PLN Cerdas		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-18	2024-10-08
133	Aplikasi ECOP		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-06-03	2024-05-10
134	PLN KITA		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-12-21	2024-12-03
135	Dmovement		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-08-12	2024-07-14
136	Aplikasi E-KHS		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-11	2024-11-03
137	Gaspro		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-06	2024-10-09
138	Aplikasi Modul Instansi Vertikal (Modiv)		3	5	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2025-01-09	2024-12-27
139	E-Insurance		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-02	2024-02-08
140	Aplikasi Sinopsis		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-07-01	2024-06-19
141	BARISTA		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-03	2024-08-19
142	Aplikasi Virtual Reality Program Listrik Desa		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-03-19	2024-03-04
143	E-RUPTL		3	4	2	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-26	2024-10-22
144	Dara Monita		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-11-03	2024-10-12
145	LMS		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-19	2024-04-13
146	Digital Learning		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-10-27	2024-10-03
147	Arc GIS		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-05-17	2024-05-15
148	Maximo		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-06-19	2024-05-24
149	SIMPUS		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-09-04	2024-09-01
150	VR LISDES GEOSPASIAL		3	4	1	100000	1970-01-01	PLN	2025-08-05 09:02:39.090486+07	\N	2024-04-01	2024-03-29
183	DASHBOARD KORPORAT		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
187	PLN PROPERTI		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
188	VIRTUAL COMMAN CENTER		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
189	MOTION TCO		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
190	Product from LIST CR DIRYANTI (ONLY 2025) - Row 34		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
191	Product from LIST CR DIRYANTI (ONLY 2025) - Row 35		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
192	Product from LIST CR DIRYANTI (ONLY 2025) - Row 36		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
193	Product from LIST CR DIRYANTI (ONLY 2025) - Row 40		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
194	Product from LIST CR DIRYANTI (ONLY 2025) - Row 41		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
195	Product from LIST CR DIRYANTI (ONLY 2025) - Row 42		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
196	Product from LIST CR DIRYANTI (ONLY 2025) - Row 43		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
197	Product from LIST CR OPKIT 2024 - Row 1		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
198	PLN KLIK		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
199	ROBOTIC NOTIFICATION		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
200	WAVE		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
201	YANBUNG		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
202	ALIH DAYA		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
203	PEREMAJAAN HARDWARE & SOFTWARE P2APST		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
204	AP2T BATAM		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
205	PORTAL HXMS		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
206	Product from LIST CR DIRYANTI (2025) - Row 85		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
207	Product from LIST CR DIRYANTI (2025) - Row 86		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
208	Product from LIST CR DIRYANTI (2025) - Row 87		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
209	Product from LIST CR DIRYANTI (2025) - Row 91		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
210	Product from LIST CR DIRYANTI (2025) - Row 92		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
211	Product from LIST CR DIRYANTI (2025) - Row 94		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
212	Product from TBC - Row 1		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
213	Aplikasi Niaga		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
214	FRA-ONLINE		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
215	Inspekta Web		1	1	\N	\N	\N	\N	2025-08-14 15:35:06.346955+07	2025-08-14 15:35:06.346955+07	\N	\N
151	Unknown Product		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
152	Product from LIST CR OPKIT 2022 -2023 - Row 1		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
153	EAM Legacy Transmisi		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
154	Transaksi Energi Listrik 		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
155	Upgrade Kartini99 dengan fitur TJB Digital Resources		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
156	Climate Click Modul Inventarisasi GRK		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
157	Climate click Modul Simulasi Carbon Trading		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
158	CBM/PST 		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
159	Dashboard Operasi dan Kinerja Pembangkitan (MAPP)		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
160	Modul Aplikasi Pengelolaan FABA (MAPP)		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
161	Portal Scada (Dashboard MCC		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
162	NEON (Nraca Energi)		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
163	NEON (Neraca Energi)		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
164	SIIPP		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
165	Aplikasi Fasilitas Operasi PLN UIP P3BS 		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
166	Product from LIST CR DIRYANTI 2023 - Row 1		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
167	SMAR  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
168	DMS  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
169	SMARTER  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
170	ESPPD  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
171	ERBAS  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
172	INSPEKTA  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
173	Digitalisasi AIL  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
174	Aplikasi Billman Pro  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
175	LMS  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
176	PLN Click  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
177	AIR Tax  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
178	VMS  		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
179	AMS KORPORAT		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
180	Motion PMO		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
181	Cash Management BAg		1	1	\N	\N	\N	\N	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	\N	\N
\.


--
-- Data for Name: tbl_produk_dev_histori; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_produk_dev_histori (id, id_produk, tipe_pekerjaan, tanggal_mulai, tanggal_akhir, version, deskripsi, created_at, updated_at, status) FROM stdin;
57	11	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
58	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
59	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
60	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
61	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
62	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
63	23	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
64	62	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
65	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
66	51	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
67	46	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
68	52	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
69	60	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
70	74	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
71	20	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
72	13	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
73	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
74	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
75	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
76	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
77	20	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
78	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
79	38	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
80	77	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
81	79	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
82	15	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
83	15	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
84	77	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
85	99	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
86	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
87	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
88	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
89	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
90	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
91	120	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
92	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
93	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
94	128	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
95	111	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
96	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
97	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
98	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
99	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
100	107	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
101	111	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
102	19	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
103	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
104	86	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
105	47	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
106	47	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
107	1	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
108	71	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
109	69	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
110	24	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
111	24	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
112	40	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
113	12	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
114	12	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
115	65	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
116	38	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
117	15	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
118	33	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
119	74	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
120	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
121	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
122	40	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
123	60	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
124	40	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
125	38	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
126	46	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
127	11	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
128	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
129	44	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
130	38	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
131	56	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
132	83	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
133	83	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
134	11	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
135	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
136	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
137	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
138	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
139	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
140	23	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
141	62	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
142	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
143	51	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
144	46	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
145	52	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
146	60	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
147	74	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
148	20	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
149	13	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
150	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
151	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
152	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
153	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
154	20	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
155	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
156	38	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
157	45	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
158	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
159	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
160	59	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
161	71	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
162	44	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
163	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
164	62	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
165	83	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
166	137	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
167	20	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
168	83	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
169	85	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
170	79	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
171	15	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
172	15	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DATA BARU/HILANG
173	48	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
174	11	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
175	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
176	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
177	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
178	47	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
179	47	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
180	46	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
181	46	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
182	46	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
183	46	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
184	46	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
185	46	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
186	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
187	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
188	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
189	1	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
190	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
191	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
192	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
193	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
194	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
195	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
196	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
197	74	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
198	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
199	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
200	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
201	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
202	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
203	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
204	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
205	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
206	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
207	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
208	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
209	1	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
210	1	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
211	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
212	1	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
213	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
214	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
215	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
216	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
217	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
218	1	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
219	1	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
220	6	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
221	71	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
222	71	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
223	71	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
224	5	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
225	69	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
226	2	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
227	84	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
228	86	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
229	24	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
230	27	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
231	24	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
232	24	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
233	24	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
234	24	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
235	24	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
236	40	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
237	40	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
238	12	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
239	12	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
240	12	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
241	65	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
242	87	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
243	9	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
244	38	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
245	38	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
246	25	SR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
247	15	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
248	33	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
249	83	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
250	25	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
251	25	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
252	59	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
253	25	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
254	74	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
255	59	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SELESAI/DEPLOY
256	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
257	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
258	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
259	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
260	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
261	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
262	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
263	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
264	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
265	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
266	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
267	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
268	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
269	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
270	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
271	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
272	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
273	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
274	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
275	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
276	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
277	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
278	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
279	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
280	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
281	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
282	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
283	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
284	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
285	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
286	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
287	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
288	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
289	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
290	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
291	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
292	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
293	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
294	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
295	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
296	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
297	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
298	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
299	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
300	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
301	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
302	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
303	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
304	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
305	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
306	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
307	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
308	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
309	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
310	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
311	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
312	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
313	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
314	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
315	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
316	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
317	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
318	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
319	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
320	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
321	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
322	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
323	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
324	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
325	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
326	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
327	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
328	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
329	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
330	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
331	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
332	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
333	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
334	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
335	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
336	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
337	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
338	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
339	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
340	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
341	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
342	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
343	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
344	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
345	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
346	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
347	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
348	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
349	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
350	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
351	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
352	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
353	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
354	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
355	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
356	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
357	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
358	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
359	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
360	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
361	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
362	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
363	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
364	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
365	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
366	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
367	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
368	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
369	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
370	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
371	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
372	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
373	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
374	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
375	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
376	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
377	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
378	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
379	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
380	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
381	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
382	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
383	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
384	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
385	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
386	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
387	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
388	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
389	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
390	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
391	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
392	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
393	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
394	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
395	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
396	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
397	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
398	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
399	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
400	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
401	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
402	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
403	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
404	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
405	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
406	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
407	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
408	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
409	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
410	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
411	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
412	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
413	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
414	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
415	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
416	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
417	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
418	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
419	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
420	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
421	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
422	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
423	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
424	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
425	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
426	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
427	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
428	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
429	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
430	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
431	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
432	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
433	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
434	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
435	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
436	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
437	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
438	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
439	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
440	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
441	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
442	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
443	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
444	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
445	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
446	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
447	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
448	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
449	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
450	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
451	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
452	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
453	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
454	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
455	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
456	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
457	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
458	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
459	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
460	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
461	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
462	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
463	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
464	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
465	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
466	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
467	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
468	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
469	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
470	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
471	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
472	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
473	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
474	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
475	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
476	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
477	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
478	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
479	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
480	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
481	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
482	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
483	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
484	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
485	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
486	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
487	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
488	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
489	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
490	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
491	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
492	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
493	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
494	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
495	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
496	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
497	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
498	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
499	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
500	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
501	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
502	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
503	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
504	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
505	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
506	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
507	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
508	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
509	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
510	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
511	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
512	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
513	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
514	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
515	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
516	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
517	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
518	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
519	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
520	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
521	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
522	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
523	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
524	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
525	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
526	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
527	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
528	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
529	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
530	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
531	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
532	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
533	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
534	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
535	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
536	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
537	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
538	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
539	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
540	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
541	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
542	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
543	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
544	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
545	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
546	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
547	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
548	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
549	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
550	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
551	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
552	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
553	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
554	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
555	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
556	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
557	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
558	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
559	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
560	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
561	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
562	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
563	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
564	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
565	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
566	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
567	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
568	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
569	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
570	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
571	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
572	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
573	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
574	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
575	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
576	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
577	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
578	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
579	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
580	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
581	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
582	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
583	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
584	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
585	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
586	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
587	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
588	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
589	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
590	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
591	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
592	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
593	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
594	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
595	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
596	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
597	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
598	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
599	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
600	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
601	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
602	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
603	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
604	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
605	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
606	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
607	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
608	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
609	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
610	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
611	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
612	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
613	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
614	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
615	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
616	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
617	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
618	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
619	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
620	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
621	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
622	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
623	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
624	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
625	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
626	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
627	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
628	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
629	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
630	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
631	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
632	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
633	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
634	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
635	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
636	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
637	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
638	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
639	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
640	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
641	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
642	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
643	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
644	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
645	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
646	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
647	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
648	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
649	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
650	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
651	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
652	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
653	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
654	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
655	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
656	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
657	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
658	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
659	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
660	151	CR	2025-08-13	2025-08-13		nan	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
661	151	CR	2025-08-13	2025-08-13		NO	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
662	151	CR	2025-08-13	2025-08-13		130	2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
663	152	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
664	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
665	153	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
666	105	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
667	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
668	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
669	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
670	154	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
671	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
672	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
673	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
674	155	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
675	120	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
676	120	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
677	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
678	154	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
679	154	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
680	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
681	154	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
682	156	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
683	157	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
684	158	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
685	154	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
686	159	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
687	160	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
688	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
689	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
690	161	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
691	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
692	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
693	162	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
694	105	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
695	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
696	154	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
697	127	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
698	93	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
699	100	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
700	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
701	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
702	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
703	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
704	120	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
705	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
706	163	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
707	164	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
708	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
709	104	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
710	99	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
711	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
712	111	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
713	128	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
714	90	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
715	113	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
716	165	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
717	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
718	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
719	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
720	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
721	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
722	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
723	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
724	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
725	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
726	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
727	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
728	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
729	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
730	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
731	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
732	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
733	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
734	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
735	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
736	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
737	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
738	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
739	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
740	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
741	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
742	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
743	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
744	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
745	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
746	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
747	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
748	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
749	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
750	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
751	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
752	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
753	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
754	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
755	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
756	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
757	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
758	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
759	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
760	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
761	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
762	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
763	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
764	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
765	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
766	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
767	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
768	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
769	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
770	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
771	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
772	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
773	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
774	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
775	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
776	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
777	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
778	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
779	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
780	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
781	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
782	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
783	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
784	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
785	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
786	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
787	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
788	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
789	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
790	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
791	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
792	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
793	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
794	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
795	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
796	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
797	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
798	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
799	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
800	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
801	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
802	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
803	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
804	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
805	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
806	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
807	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
808	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
809	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
810	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
811	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
812	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
813	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
814	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
815	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
816	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
817	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
818	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
819	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
820	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
821	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
822	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
823	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
824	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
825	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
826	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
827	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
828	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
829	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
830	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
831	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
832	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
833	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
834	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
835	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
836	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
837	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
838	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
839	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
840	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
841	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
842	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
843	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
844	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
845	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
846	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
847	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
848	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
849	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
850	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
851	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
852	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
853	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
854	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
855	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
856	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
857	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
858	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
859	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
860	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
861	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
862	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
863	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
864	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
865	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
866	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
867	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
868	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
869	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
870	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
871	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
872	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
873	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
874	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
875	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
876	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
877	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
878	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
879	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
880	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
881	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
882	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
883	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
884	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	QA INTERNAL
885	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
886	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
887	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
888	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
889	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
890	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
891	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
892	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
893	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
894	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
895	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
896	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
897	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
898	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
899	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
900	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
901	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
902	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
903	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
904	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQ
905	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
906	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
907	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
908	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
909	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
910	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
911	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
912	166	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
913	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
914	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
915	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
916	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
917	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
918	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
919	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
920	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
921	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
922	167	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
923	168	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
924	169	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
925	169	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
926	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
927	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
928	170	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
929	170	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
930	170	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
931	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
932	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
933	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
934	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
935	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
936	170	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
937	170	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
938	170	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
939	170	JR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
940	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
941	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
942	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
943	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
944	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
945	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
946	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
947	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
948	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
949	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
950	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
951	170	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
952	171	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
953	172	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
954	173	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
955	174	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
956	175	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
957	176	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
958	177	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
959	56	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
960	178	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
961	178	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
962	178	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
963	178	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
964	178	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
965	178	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
966	178	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
967	71	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
968	71	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
969	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
970	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
971	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
972	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
973	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
974	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
975	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
976	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
977	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
978	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
979	86	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
980	44	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
981	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
982	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
983	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
984	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
985	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
986	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
987	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
988	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
989	179	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
990	180	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
991	181	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
992	181	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
993	181	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
994	181	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
995	100	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
996	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
997	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
998	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
999	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1000	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1001	153	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1002	153	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1003	105	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1004	158	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1005	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1006	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1007	127	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1008	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1009	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1010	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1011	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1012	118	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	Pending
1013	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
1014	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
1015	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
1016	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
1017	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
1018	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
1019	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP UAT
1020	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
1021	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
1022	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
1023	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
1024	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
1025	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BARU
1026	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
1027	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1028	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEV
1029	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1030	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1031	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
1032	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	SIAP DEPLOY
1033	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOY
1034	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1035	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1036	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1037	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1038	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1039	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1040	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1041	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1042	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1043	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1044	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1045	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1046	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1047	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQUIREMENT
1048	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1049	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1050	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1051	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1052	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQUIREMENT
1053	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1054	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1055	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1056	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1057	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1058	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1059	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1060	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BELUM REQUIREMENT
1061	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1062	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1063	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1064	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1065	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1066	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1067	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1068	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1069	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1070	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1071	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1072	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1073	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1074	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1075	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1076	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1077	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1078	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1079	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1080	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1081	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1082	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1083	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1084	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1085	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1086	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	UAT
1087	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1088	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1089	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1090	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1091	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1092	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1093	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1094	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1095	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1096	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1097	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1098	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1099	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1100	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1101	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1102	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1103	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1104	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1105	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1106	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1107	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1108	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1109	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1110	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1111	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1112	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1113	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1114	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1115	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1116	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1117	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1118	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1119	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1120	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1121	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1122	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1123	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1124	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1125	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1126	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1127	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1128	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1129	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1130	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	UAT
1131	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1132	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1133	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1134	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1135	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1136	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	CANCEL
1137	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	CR CLOSED
1138	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1139	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1140	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1141	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1142	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	UAT
1143	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1144	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1145	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1146	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BELUM REQUIREMENT
1147	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1148	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1149	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1150	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1151	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1152	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1153	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1154	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1155	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1156	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQUIREMENT
1157	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1158	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1159	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1160	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1161	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1162	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1163	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1164	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BELUM REQUIREMENT
1165	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1166	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1167	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1168	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1169	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1170	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1171	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	UAT
1172	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	UAT
1173	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1174	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1175	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1176	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1177	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1178	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1179	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1180	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1181	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1182	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1183	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1184	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1185	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1186	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1187	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1188	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1189	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1190	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1191	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1192	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	REQUIREMENT
1193	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1194	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1195	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1196	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1197	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1198	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1199	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1200	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1201	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1202	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1203	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1204	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1205	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1206	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1207	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1208	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1209	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1210	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	CR CLOSED
1211	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1212	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1213	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1214	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1215	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1216	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1217	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1218	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1219	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	UAT
1220	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1221	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1222	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1223	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	UAT
1224	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1225	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1226	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1227	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1228	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1229	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1230	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1231	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BELUM REQUIREMENT
1232	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1233	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1234	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1235	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1236	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1237	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1238	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	UAT
1239	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEVELOPMENT
1240	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	DEPLOYMENT
1241	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BELUM REQUIREMENT
1242	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1243	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	nan
1244	151	CR	2025-08-13	2025-08-13			2025-08-13 10:30:59.145773+07	2025-08-13 10:30:59.145773+07	BELUM REQUIREMENT
\.


--
-- Data for Name: tbl_role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_role (id, role, created_at, updated_at) FROM stdin;
1	Admin	2025-07-17 08:18:21.825512+07	\N
2	User	2025-07-17 08:18:21.825512+07	\N
\.


--
-- Data for Name: tbl_segmen; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_segmen (id, segmen, created_at, updated_at, icon_light, icon_dark) FROM stdin;
1	EP & Pembangkit	2025-07-29 09:32:39.772+07	\N	segmen_light_1753756349152.svg	segmen_dark_1753756354386.svg
2	Transmisi	2025-07-29 09:35:15.386+07	\N	segmen_light_1753756505969.svg	segmen_dark_1753756511980.svg
4	Korporat	2025-07-29 09:38:37.823+07	\N	segmen_light_1753756706212.svg	segmen_dark_1753756714735.svg
5	Pelayanan Pelanggan	2025-07-29 09:40:13.629+07	\N	segmen_light_1753756806217.svg	segmen_dark_1753756811702.svg
3	Distribusi	2025-07-29 09:37:03.085+07	\N		
\.


--
-- Data for Name: tbl_stage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_stage (id, stage, created_at, updated_at, icon_light, icon_dark) FROM stdin;
1	Introduction	2025-07-29 09:56:34.758+07	\N	stage_light_1753757785048.svg	stage_dark_1753757789779.svg
2	Growth	2025-07-29 09:57:03.464+07	\N	stage_light_1753757814084.svg	stage_dark_1753757819402.svg
3	Maturity	2025-07-29 09:57:37.032+07	\N	stage_light_1753757849655.svg	stage_dark_1753757854653.svg
4	Decline	2025-07-29 09:57:55.626+07	\N	stage_light_1753757868856.svg	stage_dark_1753757873279.svg
\.


--
-- Data for Name: tbl_stage_histori; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_stage_histori (id, id_produk, stage_previous, stage_now, catatan, created_at, updated_at, tanggal_perubahan, performance_metrics) FROM stdin;
1	1	1	2	\N	2022-07-15 00:00:00+07	2022-07-15 00:00:00+07	2022-07-15 00:00:00+07	\N
2	1	2	3	\N	2023-07-15 00:00:00+07	2023-07-15 00:00:00+07	2023-07-15 00:00:00+07	\N
3	1	3	4	\N	2025-01-15 00:00:00+07	2025-01-15 00:00:00+07	2025-01-15 00:00:00+07	\N
4	6	1	2	\N	2022-07-01 00:00:00+07	2022-07-01 00:00:00+07	2022-07-01 00:00:00+07	\N
5	6	2	3	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	\N
6	11	1	2	\N	2022-11-01 00:00:00+07	2022-11-01 00:00:00+07	2022-11-01 00:00:00+07	\N
7	11	2	3	\N	2023-09-01 00:00:00+07	2023-09-01 00:00:00+07	2023-09-01 00:00:00+07	\N
8	16	1	2	\N	2023-08-01 00:00:00+07	2023-08-01 00:00:00+07	2023-08-01 00:00:00+07	\N
9	21	1	2	\N	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	\N
10	2	1	2	\N	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	\N
11	2	2	3	\N	2024-01-01 00:00:00+07	2024-01-01 00:00:00+07	2024-01-01 00:00:00+07	\N
12	2	3	4	\N	2025-09-01 00:00:00+07	2025-09-01 00:00:00+07	2025-09-01 00:00:00+07	\N
13	7	1	2	\N	2022-10-15 00:00:00+07	2022-10-15 00:00:00+07	2022-10-15 00:00:00+07	\N
14	7	2	3	\N	2023-10-15 00:00:00+07	2023-10-15 00:00:00+07	2023-10-15 00:00:00+07	\N
15	12	1	2	\N	2023-05-01 00:00:00+07	2023-05-01 00:00:00+07	2023-05-01 00:00:00+07	\N
16	12	2	3	\N	2024-09-01 00:00:00+07	2024-09-01 00:00:00+07	2024-09-01 00:00:00+07	\N
17	17	1	2	\N	2023-09-15 00:00:00+07	2023-09-15 00:00:00+07	2023-09-15 00:00:00+07	\N
18	22	1	2	\N	2023-10-01 00:00:00+07	2023-10-01 00:00:00+07	2023-10-01 00:00:00+07	\N
19	3	1	2	\N	2022-05-20 00:00:00+07	2022-05-20 00:00:00+07	2022-05-20 00:00:00+07	\N
20	3	2	3	\N	2023-03-20 00:00:00+07	2023-03-20 00:00:00+07	2023-03-20 00:00:00+07	\N
21	3	3	4	\N	2024-05-20 00:00:00+07	2024-05-20 00:00:00+07	2024-05-20 00:00:00+07	\N
22	8	1	2	\N	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	\N
23	8	2	3	\N	2023-06-01 00:00:00+07	2023-06-01 00:00:00+07	2023-06-01 00:00:00+07	\N
24	13	1	2	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	\N
25	13	2	3	\N	2024-02-01 00:00:00+07	2024-02-01 00:00:00+07	2024-02-01 00:00:00+07	\N
26	18	1	2	\N	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	\N
27	23	1	2	\N	2024-01-01 00:00:00+07	2024-01-01 00:00:00+07	2024-01-01 00:00:00+07	\N
28	4	1	2	\N	2022-05-10 00:00:00+07	2022-05-10 00:00:00+07	2022-05-10 00:00:00+07	\N
29	4	2	3	\N	2022-12-10 00:00:00+07	2022-12-10 00:00:00+07	2022-12-10 00:00:00+07	\N
30	4	3	4	\N	2023-10-10 00:00:00+07	2023-10-10 00:00:00+07	2023-10-10 00:00:00+07	\N
31	9	1	2	\N	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	2022-10-01 00:00:00+07	\N
32	9	2	3	\N	2023-04-01 00:00:00+07	2023-04-01 00:00:00+07	2023-04-01 00:00:00+07	\N
33	14	1	2	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	\N
34	14	2	3	\N	2023-11-01 00:00:00+07	2023-11-01 00:00:00+07	2023-11-01 00:00:00+07	\N
35	19	1	2	\N	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	2023-07-01 00:00:00+07	\N
36	24	1	2	\N	2023-11-01 00:00:00+07	2023-11-01 00:00:00+07	2023-11-01 00:00:00+07	\N
37	5	1	2	\N	2022-12-01 00:00:00+07	2022-12-01 00:00:00+07	2022-12-01 00:00:00+07	\N
38	5	2	3	\N	2024-06-01 00:00:00+07	2024-06-01 00:00:00+07	2024-06-01 00:00:00+07	\N
39	5	3	4	\N	2026-06-01 00:00:00+07	2026-06-01 00:00:00+07	2026-06-01 00:00:00+07	\N
40	10	1	2	\N	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	2023-03-01 00:00:00+07	\N
41	10	2	3	\N	2024-06-01 00:00:00+07	2024-06-01 00:00:00+07	2024-06-01 00:00:00+07	\N
42	15	1	2	\N	2023-09-01 00:00:00+07	2023-09-01 00:00:00+07	2023-09-01 00:00:00+07	\N
43	15	2	3	\N	2025-01-01 00:00:00+07	2025-01-01 00:00:00+07	2025-01-01 00:00:00+07	\N
44	20	1	2	\N	2023-12-01 00:00:00+07	2023-12-01 00:00:00+07	2023-12-01 00:00:00+07	\N
45	25	1	2	\N	2024-02-01 00:00:00+07	2024-02-01 00:00:00+07	2024-02-01 00:00:00+07	\N
\.


--
-- Data for Name: tbl_user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_user (id, username, email, photo, role, jabatan, password, created_at, updated_at, fullname) FROM stdin;
3	testing.itu	alfinbbm@gmail.com	1753350831373_testing.itu.png	2	3	$2b$10$ZjGJqFUrFK5Bh3QrEmGzruKUKEXBm8msd3s4XgpwDxvUeLAeLDULy	2025-07-24 08:22:01.605+07	2025-07-24 16:53:51.750128+07	testing itu
1	admin	admin@iconpln.co.id	1753253807450_admin.png	1	5	$2b$10$W7zzPvcDkucaKDsCdj8Imu1nkbYf.17vZ51TAwcc.GeKdScTd7NTm	2025-07-17 08:18:21.825512+07	2025-08-04 13:39:31.033392+07	Administrator
\.


--
-- Name: monitoring_licenses_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: jmaharyuda
--

SELECT pg_catalog.setval('public.monitoring_licenses_id_seq1', 56, true);


--
-- Name: tbl_activity_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_activity_log_id_seq', 31, true);


--
-- Name: tbl_attachment_produk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_attachment_produk_id_seq', 12, true);


--
-- Name: tbl_attachment_produk_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_attachment_produk_id_seq1', 1, false);


--
-- Name: tbl_interval_stage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_interval_stage_id_seq', 70, true);


--
-- Name: tbl_interval_stage_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_interval_stage_id_seq1', 1, false);


--
-- Name: tbl_jabatan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_jabatan_id_seq', 36, true);


--
-- Name: tbl_jabatan_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_jabatan_id_seq1', 1, false);


--
-- Name: tbl_kategori_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_kategori_id_seq', 5, true);


--
-- Name: tbl_kategori_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_kategori_id_seq1', 1, false);


--
-- Name: tbl_license_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_license_notifications_id_seq', 10, true);


--
-- Name: tbl_mon_crjr_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_mon_crjr_id_seq', 1326, true);


--
-- Name: tbl_produk_dev_histori_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_produk_dev_histori_id_seq', 1, true);


--
-- Name: tbl_produk_dev_histori_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_produk_dev_histori_id_seq1', 1244, true);


--
-- Name: tbl_produk_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_produk_id_seq', 216, true);


--
-- Name: tbl_produk_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_produk_id_seq1', 215, true);


--
-- Name: tbl_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_role_id_seq', 34, true);


--
-- Name: tbl_role_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_role_id_seq1', 1, false);


--
-- Name: tbl_segmen_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_segmen_id_seq', 5, true);


--
-- Name: tbl_segmen_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_segmen_id_seq1', 1, false);


--
-- Name: tbl_stage_histori_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_stage_histori_id_seq', 45, true);


--
-- Name: tbl_stage_histori_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_stage_histori_id_seq1', 1, false);


--
-- Name: tbl_stage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_stage_id_seq', 5, true);


--
-- Name: tbl_stage_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_stage_id_seq1', 1, false);


--
-- Name: tbl_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_user_id_seq', 25, true);


--
-- Name: tbl_user_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_user_id_seq1', 2, false);


--
-- Name: tbl_mon_licenses monitoring_licenses_pkey1; Type: CONSTRAINT; Schema: public; Owner: jmaharyuda
--

ALTER TABLE ONLY public.tbl_mon_licenses
    ADD CONSTRAINT monitoring_licenses_pkey1 PRIMARY KEY (id);


--
-- Name: tbl_activity_log tbl_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_activity_log
    ADD CONSTRAINT tbl_activity_log_pkey PRIMARY KEY (id);


--
-- Name: tbl_attachment_produk tbl_attachment_produk_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_attachment_produk
    ADD CONSTRAINT tbl_attachment_produk_pk PRIMARY KEY (id);


--
-- Name: tbl_interval_stage tbl_interval_stage_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_interval_stage
    ADD CONSTRAINT tbl_interval_stage_pk PRIMARY KEY (id);


--
-- Name: tbl_jabatan tbl_jabatan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_jabatan
    ADD CONSTRAINT tbl_jabatan_pkey PRIMARY KEY (id);


--
-- Name: tbl_kategori tbl_kategori_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_kategori
    ADD CONSTRAINT tbl_kategori_pk PRIMARY KEY (id);


--
-- Name: tbl_license_notifications tbl_license_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_license_notifications
    ADD CONSTRAINT tbl_license_notifications_pkey PRIMARY KEY (id);


--
-- Name: tbl_mon_crjr tbl_mon_crjr_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_mon_crjr
    ADD CONSTRAINT tbl_mon_crjr_pkey PRIMARY KEY (id);


--
-- Name: tbl_produk tbl_product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_produk
    ADD CONSTRAINT tbl_product_pkey PRIMARY KEY (id);


--
-- Name: tbl_produk_dev_histori tbl_produk_dev_histori_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_produk_dev_histori
    ADD CONSTRAINT tbl_produk_dev_histori_pkey PRIMARY KEY (id);


--
-- Name: tbl_role tbl_role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_role
    ADD CONSTRAINT tbl_role_pkey PRIMARY KEY (id);


--
-- Name: tbl_segmen tbl_segmen_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_segmen
    ADD CONSTRAINT tbl_segmen_pk PRIMARY KEY (id);


--
-- Name: tbl_stage_histori tbl_stage_histori_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_stage_histori
    ADD CONSTRAINT tbl_stage_histori_pkey PRIMARY KEY (id);


--
-- Name: tbl_stage tbl_stage_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_stage
    ADD CONSTRAINT tbl_stage_pk PRIMARY KEY (id);


--
-- Name: tbl_user tbl_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_user
    ADD CONSTRAINT tbl_users_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_log_activity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_activity_type ON public.tbl_activity_log USING btree (activity_type);


--
-- Name: idx_activity_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_created_at ON public.tbl_activity_log USING btree (created_at);


--
-- Name: idx_activity_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_user_id ON public.tbl_activity_log USING btree (user_id);


--
-- Name: idx_attachment_produk_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachment_produk_created_at ON public.tbl_attachment_produk USING btree (created_at DESC);


--
-- Name: idx_attachment_produk_produk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachment_produk_produk_id ON public.tbl_attachment_produk USING btree (produk_id);


--
-- Name: idx_attachment_produk_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachment_produk_type ON public.tbl_attachment_produk USING btree (type);


--
-- Name: idx_dashboard_stats_covering; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dashboard_stats_covering ON public.tbl_produk USING btree (id_stage) INCLUDE (id);


--
-- Name: idx_dev_histori_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_histori_created_at ON public.tbl_produk_dev_histori USING btree (created_at DESC);


--
-- Name: idx_dev_histori_produk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_histori_produk ON public.tbl_produk_dev_histori USING btree (id_produk);


--
-- Name: idx_dev_histori_produk_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_histori_produk_dates ON public.tbl_produk_dev_histori USING btree (id_produk, tanggal_mulai DESC, tanggal_akhir DESC);


--
-- Name: idx_dev_histori_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_histori_status ON public.tbl_produk_dev_histori USING btree (status);


--
-- Name: idx_dev_histori_tipe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_histori_tipe ON public.tbl_produk_dev_histori USING btree (tipe_pekerjaan);


--
-- Name: idx_dev_histori_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_histori_version ON public.tbl_produk_dev_histori USING btree (version);


--
-- Name: idx_interval_stage_interval; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interval_stage_interval ON public.tbl_interval_stage USING btree ("interval");


--
-- Name: idx_interval_stage_previous; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interval_stage_previous ON public.tbl_interval_stage USING btree (id_stage);


--
-- Name: idx_jabatan_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jabatan_created_at ON public.tbl_jabatan USING btree (created_at DESC);


--
-- Name: idx_jabatan_jabatan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jabatan_jabatan ON public.tbl_jabatan USING btree (jabatan);


--
-- Name: idx_kategori_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kategori_created_at ON public.tbl_kategori USING btree (created_at DESC);


--
-- Name: idx_kategori_kategori; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kategori_kategori ON public.tbl_kategori USING btree (kategori);


--
-- Name: idx_license_notifications_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_license_notifications_date ON public.tbl_license_notifications USING btree (notification_date);


--
-- Name: idx_license_notifications_date_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_license_notifications_date_status ON public.tbl_license_notifications USING btree (notification_date, license_id);


--
-- Name: idx_license_notifications_license_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_license_notifications_license_id ON public.tbl_license_notifications USING btree (license_id);


--
-- Name: idx_license_notifications_sent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_license_notifications_sent ON public.tbl_license_notifications USING btree (is_sent);


--
-- Name: idx_mon_licenses_status_expiry; Type: INDEX; Schema: public; Owner: jmaharyuda
--

CREATE INDEX idx_mon_licenses_status_expiry ON public.tbl_mon_licenses USING btree (status, akhir_layanan) WHERE ((status)::text <> ALL ((ARRAY['Expired'::character varying, 'Inactive'::character varying])::text[]));


--
-- Name: idx_produk_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_created_at ON public.tbl_produk USING btree (created_at);


--
-- Name: idx_produk_dashboard_stats; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_dashboard_stats ON public.tbl_produk USING btree (id_stage, id_kategori, id_segmen, created_at DESC);


--
-- Name: idx_produk_harga; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_harga ON public.tbl_produk USING btree (harga);


--
-- Name: idx_produk_kategori; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_kategori ON public.tbl_produk USING btree (id_kategori);


--
-- Name: idx_produk_pelanggan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_pelanggan ON public.tbl_produk USING btree (pelanggan);


--
-- Name: idx_produk_produk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_produk ON public.tbl_produk USING btree (produk);


--
-- Name: idx_produk_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_search ON public.tbl_produk USING gin (to_tsvector('indonesian'::regconfig, (((((produk)::text || ' '::text) || COALESCE(deskripsi, ''::text)) || ' '::text) || (COALESCE(pelanggan, ''::character varying))::text)));


--
-- Name: idx_produk_segmen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_segmen ON public.tbl_produk USING btree (id_segmen);


--
-- Name: idx_produk_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_stage ON public.tbl_produk USING btree (id_stage);


--
-- Name: idx_produk_stage_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_stage_dates ON public.tbl_produk USING btree (id_stage, tanggal_stage_start, tanggal_stage_end);


--
-- Name: idx_produk_stage_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_stage_duration ON public.tbl_produk USING btree (id_stage, tanggal_stage_start, tanggal_stage_end) WHERE (tanggal_stage_start IS NOT NULL);


--
-- Name: idx_produk_stage_kategori; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_stage_kategori ON public.tbl_produk USING btree (id_stage, id_kategori);


--
-- Name: idx_produk_tanggal_launch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_tanggal_launch ON public.tbl_produk USING btree (tanggal_launch DESC);


--
-- Name: idx_produk_tanggal_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produk_tanggal_stage ON public.tbl_produk USING btree (tanggal_stage_start, tanggal_stage_end);


--
-- Name: idx_role_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_role ON public.tbl_role USING btree (role);


--
-- Name: idx_segmen_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_segmen_created_at ON public.tbl_segmen USING btree (created_at DESC);


--
-- Name: idx_segmen_segmen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_segmen_segmen ON public.tbl_segmen USING btree (segmen);


--
-- Name: idx_stage_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_created_at ON public.tbl_stage USING btree (created_at DESC);


--
-- Name: idx_stage_histori_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_histori_created_at ON public.tbl_stage_histori USING btree (created_at DESC);


--
-- Name: idx_stage_histori_now; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_histori_now ON public.tbl_stage_histori USING btree (stage_now);


--
-- Name: idx_stage_histori_previous; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_histori_previous ON public.tbl_stage_histori USING btree (stage_previous);


--
-- Name: idx_stage_histori_produk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_histori_produk ON public.tbl_stage_histori USING btree (id_produk);


--
-- Name: idx_stage_histori_produk_timeline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_histori_produk_timeline ON public.tbl_stage_histori USING btree (id_produk, created_at DESC);


--
-- Name: idx_stage_histori_transition; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_histori_transition ON public.tbl_stage_histori USING btree (stage_previous, stage_now);


--
-- Name: idx_stage_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stage_stage ON public.tbl_stage USING btree (stage);


--
-- Name: idx_tbl_attachment_produk_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_attachment_produk_id ON public.tbl_attachment_produk USING btree (produk_id);


--
-- Name: idx_tbl_jabatan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_jabatan_id ON public.tbl_jabatan USING btree (id);


--
-- Name: idx_tbl_mon_crjr_id_produk; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_mon_crjr_id_produk ON public.tbl_mon_crjr USING btree (id_produk);


--
-- Name: idx_tbl_mon_crjr_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_mon_crjr_status ON public.tbl_mon_crjr USING btree (status);


--
-- Name: idx_tbl_mon_crjr_tanggal_mulai; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_mon_crjr_tanggal_mulai ON public.tbl_mon_crjr USING btree (tanggal_mulai);


--
-- Name: idx_tbl_mon_crjr_tipe_pekerjaan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_mon_crjr_tipe_pekerjaan ON public.tbl_mon_crjr USING btree (tipe_pekerjaan);


--
-- Name: idx_tbl_mon_licenses_akhir_layanan; Type: INDEX; Schema: public; Owner: jmaharyuda
--

CREATE INDEX idx_tbl_mon_licenses_akhir_layanan ON public.tbl_mon_licenses USING btree (akhir_layanan);


--
-- Name: idx_tbl_mon_licenses_bpo; Type: INDEX; Schema: public; Owner: jmaharyuda
--

CREATE INDEX idx_tbl_mon_licenses_bpo ON public.tbl_mon_licenses USING btree (bpo);


--
-- Name: idx_tbl_mon_licenses_jenis_lisensi; Type: INDEX; Schema: public; Owner: jmaharyuda
--

CREATE INDEX idx_tbl_mon_licenses_jenis_lisensi ON public.tbl_mon_licenses USING btree (jenis_lisensi);


--
-- Name: idx_tbl_mon_licenses_nama_aplikasi; Type: INDEX; Schema: public; Owner: jmaharyuda
--

CREATE INDEX idx_tbl_mon_licenses_nama_aplikasi ON public.tbl_mon_licenses USING btree (nama_aplikasi);


--
-- Name: idx_tbl_mon_licenses_status; Type: INDEX; Schema: public; Owner: jmaharyuda
--

CREATE INDEX idx_tbl_mon_licenses_status ON public.tbl_mon_licenses USING btree (status);


--
-- Name: idx_tbl_mon_licenses_status_akhir; Type: INDEX; Schema: public; Owner: jmaharyuda
--

CREATE INDEX idx_tbl_mon_licenses_status_akhir ON public.tbl_mon_licenses USING btree (status, akhir_layanan);


--
-- Name: idx_tbl_mon_licenses_tanggal_aktivasi; Type: INDEX; Schema: public; Owner: jmaharyuda
--

CREATE INDEX idx_tbl_mon_licenses_tanggal_aktivasi ON public.tbl_mon_licenses USING btree (tanggal_aktivasi);


--
-- Name: idx_tbl_produk_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_created_at ON public.tbl_produk USING btree (created_at DESC);


--
-- Name: idx_tbl_produk_id_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_id_desc ON public.tbl_produk USING btree (id DESC);


--
-- Name: idx_tbl_produk_kategori; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_kategori ON public.tbl_produk USING btree (id_kategori);


--
-- Name: idx_tbl_produk_kategori_segmen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_kategori_segmen ON public.tbl_produk USING btree (id_kategori, id_segmen);


--
-- Name: idx_tbl_produk_segmen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_segmen ON public.tbl_produk USING btree (id_segmen);


--
-- Name: idx_tbl_produk_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_stage ON public.tbl_produk USING btree (id_stage);


--
-- Name: idx_tbl_produk_stage_kategori; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_stage_kategori ON public.tbl_produk USING btree (id_stage, id_kategori);


--
-- Name: idx_tbl_produk_stage_segmen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_stage_segmen ON public.tbl_produk USING btree (id_stage, id_segmen);


--
-- Name: idx_tbl_produk_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_produk_updated_at ON public.tbl_produk USING btree (updated_at DESC);


--
-- Name: idx_tbl_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_role_id ON public.tbl_role USING btree (id);


--
-- Name: idx_tbl_stage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_stage_id ON public.tbl_stage USING btree (id);


--
-- Name: idx_tbl_user_jabatan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_user_jabatan ON public.tbl_user USING btree (jabatan);


--
-- Name: idx_tbl_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_user_role ON public.tbl_user USING btree (role);


--
-- Name: idx_tbl_user_role_jabatan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_user_role_jabatan ON public.tbl_user USING btree (role, jabatan);


--
-- Name: idx_tbl_user_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tbl_user_username ON public.tbl_user USING btree (username);


--
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_email ON public.tbl_user USING btree (email);


--
-- Name: idx_user_fullname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_fullname ON public.tbl_user USING btree (fullname);


--
-- Name: idx_user_jabatan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_jabatan ON public.tbl_user USING btree (jabatan);


--
-- Name: idx_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_role ON public.tbl_user USING btree (role);


--
-- Name: idx_user_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_username ON public.tbl_user USING btree (username);


--
-- Name: tbl_mon_licenses trigger_generate_no_urut; Type: TRIGGER; Schema: public; Owner: jmaharyuda
--

CREATE TRIGGER trigger_generate_no_urut BEFORE INSERT ON public.tbl_mon_licenses FOR EACH ROW EXECUTE FUNCTION public.generate_no_urut();


--
-- Name: tbl_mon_licenses update_monitoring_licenses_updated_at; Type: TRIGGER; Schema: public; Owner: jmaharyuda
--

CREATE TRIGGER update_monitoring_licenses_updated_at BEFORE UPDATE ON public.tbl_mon_licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tbl_mon_crjr update_tbl_mon_crjr_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tbl_mon_crjr_updated_at BEFORE UPDATE ON public.tbl_mon_crjr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tbl_mon_licenses update_tbl_mon_licenses_updated_at; Type: TRIGGER; Schema: public; Owner: jmaharyuda
--

CREATE TRIGGER update_tbl_mon_licenses_updated_at BEFORE UPDATE ON public.tbl_mon_licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tbl_activity_log tbl_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_activity_log
    ADD CONSTRAINT tbl_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_user(id) ON DELETE CASCADE;


--
-- Name: tbl_license_notifications tbl_license_notifications_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_license_notifications
    ADD CONSTRAINT tbl_license_notifications_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.tbl_mon_licenses(id) ON DELETE CASCADE;


--
-- Name: tbl_mon_crjr tbl_mon_crjr_id_produk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tbl_mon_crjr
    ADD CONSTRAINT tbl_mon_crjr_id_produk_fkey FOREIGN KEY (id_produk) REFERENCES public.tbl_produk(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

