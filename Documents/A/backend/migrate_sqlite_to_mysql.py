import sqlite3
import pymysql

# Koneksi ke SQLite
sqlite_conn = sqlite3.connect('app.db')
sqlite_cur = sqlite_conn.cursor()

# Koneksi ke MySQL
mysql_conn = pymysql.connect(
    host='localhost',
    user='root',
    password='PasswordBaru123!',
    database='image_db'
)
mysql_cur = mysql_conn.cursor()

# Ambil semua data user dari SQLite
sqlite_cur.execute("SELECT * FROM user")
rows = sqlite_cur.fetchall()

# Ambil nama kolom
columns = [desc[0] for desc in sqlite_cur.description]
col_str = ','.join(columns)
placeholders = ','.join(['%s'] * len(columns))

# Masukkan ke MySQL
for row in rows:
    try:
        mysql_cur.execute(f"INSERT IGNORE INTO user ({col_str}) VALUES ({placeholders})", row)
    except Exception as e:
        print("Gagal insert row:", row)
        print(e)

mysql_conn.commit()
print("Migrasi selesai.")

# Tutup koneksi
sqlite_conn.close()
mysql_conn.close()
