# Panduan Konfigurasi Infrastruktur & Deployment Standalone

Direktori ini berisi playbook Ansible, konfigurasi Docker Compose untuk Caddy, dan instruksi untuk melakukan provisioning server serta deployment aplikasi **URL Shortener** di lingkungan server.

---

## Daftar Isi

* [1. Ringkasan Arsitektur](#1-ringkasan-arsitektur)
* [2. Alur Variabel (Cara Kerja)](#2-alur-variabel-cara-kerja)
* [3. Lokasi Kustomisasi Konfigurasi](#3-lokasi-kustomisasi-konfigurasi)
* [4. Panduan Login SSH & Penggunaan SSH Key](#4-panduan-login-ssh--penggunaan-ssh-key)
* [5. Setup Server Pertama Kali (Ansible)](#5-setup-server-pertama-kali-ansible)
* [6. Panduan Deployment Aplikasi](#6-panduan-deployment-aplikasi)
* [7. Akses Database Secara Aman via SSH Tunneling](#7-akses-database-secara-aman-via-ssh-tunneling)
* [8. Penting: Konfigurasi SSL Caddy, Cloudflare, & DNS Troubleshooting](#8-penting-konfigurasi-ssl-caddy-cloudflare--dns-troubleshooting)

---

## 1. Ringkasan Arsitektur

```mermaid
graph TD
    subgraph Host Server
        Caddy[Caddy Container Gateway]
        Net[caddy_net - Docker Network]
        App[url-shortener-app-1 Container]
    end

    Internet([Internet]) -->|Port 80/443| Caddy
    Caddy -->|Reverse Proxy| Net
    Net -->|url.app.my.id| App
```

* **Caddy Gateway**: Berjalan sebagai kontainer Docker mandiri (`caddy-gateway`). Caddy mengikat port host `80` dan `443` untuk mengotomatiskan pembuatan & pembaruan sertifikat SSL (via Let's Encrypt/ZeroSSL) serta meneruskan traffic (reverse proxy).
* **Shared Network (`caddy_net`)**: Network Docker eksternal yang menjembatani kontainer Caddy dengan kontainer aplikasi. Aplikasi akan bergabung ke network ini agar Caddy dapat mengakses kontainer aplikasi menggunakan hostname (contoh: `url-shortener-app-1`).
* **Isolasi Database**: Database PostgreSQL berjalan di network internal terisolasi (`url_shortener_network`) dan **tidak diekspos** ke network publik Caddy.

---

## 2. Alur Variabel (Cara Kerja)

Agar kita tidak perlu menulis kredensial/domain secara manual di server atau repositori, variabel disalurkan secara dinamis saat deployment:

```
[1] scripts/deploy/standalone/ansible/playbook.yml (vars)
                │
                ▼ (Ansible deploy)
[2] /home/deploy/caddy/.env (di dalam remote server)
                │
                ▼ (Injeksi otomatis oleh Docker Compose)
[3] Environment di dalam Kontainer Caddy
                │
                ▼ (Resolusi runtime Caddy)
[4] scripts/deploy/standalone/caddy/Caddyfile (menggunakan sintaks {$VAR})
```

---

## 3. Lokasi Kustomisasi Konfigurasi

### Skenario A: Anda ingin mengubah Domain atau Email Notifikasi SSL untuk Server
**Jangan pernah mengubah `scripts/deploy/standalone/caddy/Caddyfile` atau `scripts/deploy/standalone/caddy/compose.yml` secara langsung.**

Cukup ubah variabel pada file [ansible/playbook.yml](ansible/playbook.yml) di dalam blok `vars:`:

```yaml
  vars:
    app_user: deploy
    app_dir: /home/deploy/app
    swap_size_gb: 1
    domain: app.my.id                          # <-- Ubah domain utama Anda di sini
    caddy_acme_email: sammidev4@gmail.com          # <-- Ubah email notifikasi sertifikat SSL di sini
    caddy_app_domain: 'url.{{ domain }}'           # <-- Domain aplikasi (url.app.my.id)
```

Saat Anda menjalankan playbook Ansible, semua nilai di atas otomatis ditulis ke file `/home/deploy/caddy/.env` di server.

---

### Skenario B: Anda ingin menguji Caddy secara lokal di laptop Anda
Jika dijalankan secara lokal tanpa Ansible, `Caddyfile` memiliki nilai default (fallback) otomatis:
* `{$APP_DOMAIN:url.local}` akan fallback ke: `url.local`

Untuk menjalankan lokal dengan domain custom:
1. Buat file `.env` di dalam direktori `scripts/deploy/standalone/caddy/`.
2. Masukkan domain testing Anda:
   ```env
   APP_DOMAIN=local.mydev.com
   ACME_EMAIL=dev@mydev.com
   ```
3. Jalankan `docker compose up -d` di dalam folder `scripts/deploy/standalone/caddy`.

---

## 4. Panduan Login SSH & Penggunaan SSH Key

Proses autentikasi menggunakan **SSH Keypair** yang sama dari awal hingga akhir.

1. **Kunci SSH Yang Digunakan**:
   Pastikan Anda memiliki file private key di laptop Anda (misalnya `~/.ssh/url-shortener-server`) yang berpasangan dengan public key `~/.ssh/url-shortener-server.pub`.
2. **Cara Kerja Autentikasi**:
   Saat playbook Ansible dijalankan pertama kali, ia akan membaca `url-shortener-server.pub` dari laptop Anda dan mendaftarkannya ke dalam file authorized keys milik user `deploy` yang baru dibuat di server.
3. **Perubahan Hak Akses Root**:
   Untuk alasan keamanan, Ansible menonaktifkan login SSH langsung menggunakan user `root` (`PermitRootLogin no`).
4. **Perintah Login Setelah Setup**:
   Setelah server berhasil dikonfigurasi, Anda harus login menggunakan user `deploy` dengan perintah:
   ```bash
   ssh -i ~/.ssh/url-shortener-server deploy@IP_SERVER_ANDA
   ```
   *Jika butuh hak akses root di dalam server, Anda cukup menjalankan perintah dengan `sudo` (contoh: `sudo systemctl status docker`) atau berpindah shell dengan command `sudo -i`.*

---

## 5. Setup Server Pertama Kali (Ansible)

Gunakan langkah-langkah ini setelah Anda membuat VM/droplet baru di provider cloud Anda.

### Langkah 1: Konfigurasi IP Server di Inventory
Buka file [ansible/inventory](ansible/inventory) dan ganti IP default dengan IP publik server baru Anda:
```ini
152.42.170.209
```

### Langkah 2: Jalankan Playbook Sebagai Root (Hanya Pertama Kali)
Karena user `deploy` belum ada di server baru, Anda harus menjalankan Ansible sebagai user default cloud (biasanya `root` atau `ubuntu`):
```bash
cd scripts/deploy/standalone/ansible
ansible-playbook -i inventory playbook.yml -u root
```
Perintah ini akan secara otomatis:
* Menginstal docker, docker compose, git, ufw, dll.
* Membuat user `deploy` dan mendaftarkan public key `url-shortener-server.pub`.
* Mengamankan SSH daemon (blokir login root langsung).
* Menjalankan kontainer Caddy Gateway.

### Langkah 3: Verifikasi Koneksi & Update (Selanjutnya)
Untuk perubahan konfigurasi di masa mendatang, Anda bisa langsung menjalankan playbook menggunakan user `deploy`:
```bash
ansible-playbook -i inventory playbook.yml -u deploy
```

---

## 6. Panduan Deployment Aplikasi

Deployment aplikasi URL Shortener dilakukan dengan melakukan clone/pull git dan build langsung di server menggunakan Docker Compose.

### Langkah 1: Persiapan SSH Key & GitHub Deploy Key (Penting)
Sebelum melakukan clone, pastikan public key server (`deploy` user) telah didaftarkan ke repositori GitHub Anda agar server memiliki izin akses:
1. Ambil public key server:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. Salin teks output yang muncul, lalu daftarkan di GitHub: **Settings ➔ Deploy Keys ➔ Add deploy key** (biarkan `Allow write access` tidak dicentang untuk keamanan).

### Langkah 2: Login ke Server VPS
```bash
ssh -i ~/.ssh/url-shortener-server deploy@IP_SERVER_ANDA
```

### Langkah 3: Clone Repositori (Hanya untuk Pertama Kali)
Jika ini adalah instalasi pertama kali, folder `/home/deploy/app` sudah dibuat oleh Ansible tetapi masih dalam keadaan kosong. Lakukan clone repositori menggunakan alamat SSH ke folder tersebut:
```bash
git clone git@github.com:semmidev/url-shortener.git /home/deploy/app
```

### Langkah 4: Masuk ke folder aplikasi & Pull dari GitHub (Untuk Pembaruan Selanjutnya)
Jika repositori sudah ter-clone sebelumnya dan Anda ingin melakukan update:
```bash
cd /home/deploy/app

# Pull update terbaru dari repositori GitHub Anda
git pull origin main
```

### Langkah 5: Konfigurasi File Environment (.env)
Salin file `.env.example` menjadi `.env` dan sesuaikan isinya:
```bash
cd /home/deploy/app
cp .env.example .env
nano .env
```
Variabel penting yang wajib disesuaikan di server:
* `APP_ENV=production`
* `APP_BASE_URL=https://url.app.my.id` (Sesuaikan dengan domain Anda)
* `APP_LOCALE=id`
* `DB_SOURCE=postgres://postgres:secure_password@postgres:5432/urlshortener?sslmode=disable`
* `JWT_SECRET` (Gunakan string acak minimal 32 karakter yang aman)
* `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` & `GOOGLE_REDIRECT_URI` (Untuk Google Login)

### Langkah 6: Jalankan Aplikasi
Gunakan target Makefile untuk membangun dan menjalankan seluruh kontainer Docker:
```bash
# Menjalankan kontainer di background
make docker-up
```
Perintah ini akan secara otomatis:
* Membuat docker network `caddy_net` jika belum ada.
* Membangun binary Go backend API.
* Menjalankan database PostgreSQL dan backend server.
* Menghubungkan container `app` ke `caddy_net` agar dapat di-reverse proxy oleh gateway Caddy.

### Langkah 7: Verifikasi Log Kontainer
Pastikan semua service berjalan dengan baik:
```bash
make docker-logs
```

---

## 7. Akses Database Secara Aman via SSH Tunneling

Karena database terisolasi dari internet publik dan hanya mengikat port ke `127.0.0.1` di host server, gunakan SSH Tunneling untuk menghubungkan database client (seperti DBeaver, TablePlus, pgAdmin) dari laptop lokal Anda:

1. Jalankan perintah SSH Tunneling ini di terminal laptop Anda (misalnya memetakan port lokal 5432 ke port 5432 di server):
   ```bash
   ssh -N -L 5432:127.0.0.1:5432 deploy@IP_SERVER_ANDA -i ~/.ssh/url-shortener-server
   ```
   *(Jika port 5432 di laptop lokal Anda sedang digunakan oleh PostgreSQL lokal, Anda dapat mengubah port lokal menjadi misalnya 5433: `ssh -N -L 5433:127.0.0.1:5432 deploy...`)*

2. Hubungkan dari database client lokal menggunakan:
   * **Host**: `127.0.0.1`
   * **Port**: `5432` (atau port lokal yang Anda tentukan)
   * **User**: *(User dari file .env)*
   * **Database**: `urlshortener`
   * **Password**: *(Password dari file .env)*

*(Biarkan terminal SSH tetap terbuka selama Anda terhubung ke database)*

---

### Tips: Akses Repositori Private di Server (Gunakan SSH Deploy Keys - Sangat Direkomendasikan)
Jika repositori GitHub Anda bersifat private, Anda tidak bisa melakukan `git clone` atau `git pull` tanpa autentikasi. Cara terbaik dan paling aman adalah menggunakan **GitHub Deploy Keys**:

Ansible **secara otomatis membuat SSH Key (Ed25519) tanpa passphrase** untuk user `deploy` saat setup pertama kali dan mencetaknya di akhir proses setup.

1. **Ambil Public Key yang Sudah Dibuat**:
   Jika Anda melewatkan cetakan output di terminal saat setup, Anda bisa melihat kembali public key tersebut dengan login ke server dan mengetik:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   *Salin (copy) seluruh teks output yang muncul di terminal.*
2. **Daftarkan ke GitHub**:
   * Buka repositori Anda di GitHub web ➔ **Settings** ➔ **Deploy Keys** (di menu sebelah kiri).
   * Klik tombol **Add deploy key**.
   * Tempelkan (paste) public key tadi di kolom *Key*, beri judul bebas (contoh: `URL Shortener Server Gateway`), lalu klik **Add key** (biarkan pilihan *Allow write access* kosong agar repositori bersifat read-only demi keamanan).
3. **Clone Repositori Pertama Kali Menggunakan SSH URL**:
   Kembali ke server, lakukan git clone pertama kali menggunakan format alamat SSH:
   ```bash
   git clone git@github.com:semmidev/url-shortener.git /home/deploy/app
   ```

---

### Langkah 5: Update Caddyfile di VPS (Tanpa Downtime)

Jika Anda mengubah file `scripts/deploy/standalone/caddy/Caddyfile` (misalnya setelah pull dari repo), ikuti langkah berikut untuk menerapkannya ke server **tanpa restart dan tanpa downtime**.

> Caddy memisahkan config-nya di direktori `~/caddy/` (bukan langsung di `~/app/`).
> Jadi setelah pull, Anda perlu copy manual ke sana sebelum reload.

#### 1. Copy Caddyfile ke direktori Caddy

```bash
cp ~/app/scripts/deploy/standalone/caddy/Caddyfile ~/caddy/Caddyfile
```

#### 2. Validasi config terlebih dahulu (opsional tapi disarankan)

```bash
docker exec caddy-gateway-caddy-1 caddy validate --config /etc/caddy/Caddyfile
```

Jika output menunjukkan error, perbaiki dulu sebelum lanjut — config lama tetap berjalan.

#### 3. Hot-reload Caddy

```bash
docker exec caddy-gateway-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

Atau jika bekerja dari direktori `~/caddy/`:

```bash
cd ~/caddy
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
```

> **Cara kerja `caddy reload`**: Caddy memvalidasi config baru terlebih dahulu sebelum menerapkannya. Jika ada error, config lama tetap aktif. SSL certificate dan koneksi aktif tidak akan terputus.

#### 4. Verifikasi perubahan berhasil

```bash
# Cek log untuk memastikan tidak ada error
docker logs caddy-gateway-caddy-1 --tail 20

# Konfirmasi kompresi gzip aktif (harus muncul: content-encoding: gzip)
curl -sI -H "Accept-Encoding: gzip" https://url.app.my.id | grep -i "content-encoding"

# Konfirmasi security headers aktif
curl -sI https://url.app.my.id | grep -iE "x-content-type|x-frame|referrer"
```

Jika `content-encoding: gzip` muncul, berarti kompresi sudah aktif dan perubahan berhasil diterapkan.

---

## 8. Penting: Konfigurasi SSL Caddy, Cloudflare, & DNS Troubleshooting

### ☁️ Integrasi SSL Caddy dengan Cloudflare (Proxy vs DNS Only)
Saat Anda pertama kali mendeploy server dengan Ansible atau memperbarui konfigurasi domain baru di Caddy:
1. **Matikan Proxy Cloudflare Sementara (DNS Only)**:
   * Masuk ke dashboard Cloudflare ➔ **DNS**.
   * Ubah status proxy sub/domain Anda dari **Proxied** (awan oranye) menjadi **DNS Only** (awan abu-abu).
   * Hal ini wajib dilakukan agar server Let's Encrypt / ZeroSSL dari luar bisa melakukan verifikasi domain ke Caddy via HTTP-01 challenge untuk menerbitkan sertifikat SSL pertama kali.
2. **Aktifkan Kembali Proxy**:
   * Setelah setup selesai dan SSL berhasil dibuat (domain bisa diakses via HTTPS tanpa error sertifikat), kembalikan status DNS di Cloudflare menjadi **Proxied** (awan oranye) untuk proteksi DDoS dan caching.
   * Pastikan pengaturan enkripsi SSL/TLS di Cloudflare diset ke **Full** atau **Full (strict)** agar koneksi terenkripsi dari Cloudflare ke VPS Caddy Anda tetap berjalan.

### 🌐 Masalah Cache DNS Negatif (DNS Propagation / NXDOMAIN)
Jika domain/subdomain baru diganti arahnya ke Cloudflare, beberapa komputer (terutama macOS) terkadang tidak bisa membuka situs dan memunculkan error seperti `Site can't be reached` atau `Could not resolve host`, padahal server di VPS sudah berjalan dengan baik.

Berikut adalah langkah diagnosis dan solusinya:

1. **Uji DNS Secara Global**:
   Pastikan DNS publik sudah terupdate dengan melakukan query menggunakan DNS server 1.1.1.1 (Cloudflare) atau 8.8.8.8 (Google):
   ```bash
   dig @1.1.1.1 url.app.my.id A
   ```
   Jika IP Cloudflare terdeteksi di sana, berarti DNS domain sudah benar secara global.

2. **Bypass Cache dengan Curl**:
   Untuk menguji apakah server berjalan dan masalahnya hanya di DNS lokal laptop Anda, lakukan curl dengan parameter `--resolve` untuk memaksa koneksi ke IP tujuan tanpa menggunakan DNS lokal:
   ```bash
   curl -Iv --resolve url.app.my.id:443:104.21.29.201 https://url.app.my.id/
   ```
   Jika curl mengembalikan status `HTTP/2 200 OK` via Caddy, berarti server Anda 100% normal dan masalahnya murni cache DNS lokal.

3. **Bersihkan Cache DNS (Flush DNS)**:
   * **macOS**: Bersihkan cache DNS resolver dengan perintah:
     ```bash
     sudo killall -HUP mDNSResponder
     ```
   * **Windows**: Jalankan Command Prompt (Administrator) lalu ketik:
     ```cmd
     ipconfig /flushdns
     ```
   * **Browser**: Beberapa browser memiliki cache DNS internal. Anda dapat menutup seluruh jendela browser dan membukanya kembali dalam mode **Incognito/Private Window**.
