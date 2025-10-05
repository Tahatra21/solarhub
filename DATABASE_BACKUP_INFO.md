# Database Backup Information

## 📁 Database Files

### 1. `lifecycle_db_backup.sql` (384 KB)
- **Date**: September 14, 2024
- **Description**: Complete database backup with all tables and data
- **Tables**: All production tables including users, products, lifecycle data
- **Status**: ✅ Complete backup

### 2. `setup-dynamic-rbac.sql` (4 KB)
- **Date**: October 5, 2024
- **Description**: Dynamic RBAC system setup
- **Content**: Role management tables and permissions
- **Status**: ✅ RBAC setup complete

### 3. `database_backup_20251006_000610.sql` (0 KB)
- **Date**: October 6, 2024
- **Description**: Empty backup file (generated but no data)
- **Status**: ⚠️ Empty file

## 🗄️ Database Schema

### Core Tables:
- `tbl_user` - User accounts and authentication
- `tbl_role` - User roles (Admin, Contributor, User)
- `tbl_jabatan` - Job positions
- `tbl_product` - Product information
- `tbl_lifecycle` - Product lifecycle data
- `tbl_crjr` - Change Request / Job Request data
- `tbl_license` - License monitoring data
- `tbl_run_program` - Program execution data

### RBAC Tables:
- `tbl_menu_items` - Dynamic menu configuration
- `tbl_role_permissions` - Role-based permissions
- `tbl_user_roles` - User role assignments

## 🔧 Database Connection

- **Host**: localhost
- **Port**: 5432
- **Database**: product_lifecycle
- **User**: postgres
- **Connection**: Uses DATABASE_URL environment variable

## 📋 Backup Instructions

To restore the database:

1. **Full Restore** (Recommended):
   ```bash
   psql -U postgres -d product_lifecycle < lifecycle_db_backup.sql
   ```

2. **RBAC Setup Only**:
   ```bash
   psql -U postgres -d product_lifecycle < setup-dynamic-rbac.sql
   ```

## ⚠️ Important Notes

- The `lifecycle_db_backup.sql` contains the complete production database
- All user accounts, products, and lifecycle data are included
- RBAC system is fully configured and operational
- Database uses PostgreSQL with bcrypt password hashing

## 🔐 Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Role-based access control implemented
- Database connection uses environment variables

---
*Last Updated: $(date)*
