@echo off
REM Starts the isolated MariaDB instance used as the local secondary DB for this project.
REM Uses its own data directory (data_shivdutt_bio) and port 3307 so it never touches
REM the main XAMPP MySQL install or its data.
"C:\xampp\mysql\bin\mysqld.exe" --datadir="C:\xampp\mysql\data_shivdutt_bio" --port=3307 --socket="C:\xampp\mysql\data_shivdutt_bio\mysql.sock" --console
