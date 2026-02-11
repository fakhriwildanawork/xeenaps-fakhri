# XEENAPS ARCHITECTURE PROTOCOL (Hybrid Cloud PKM)

Dokumen ini berfungsi sebagai panduan standar bagi AI dan Developer dalam mengembangkan Xeenaps. Seluruh perubahan kode harus mematuhi struktur ini untuk menjaga stabilitas, kecepatan, dan integritas data.

## 1. Single Source of Truth (Database Registry)
*   **Database Utama**: Supabase (PostgreSQL).
*   **Data yang Disimpan**: Semua Metadata (Judul, Author, Tahun, Kategori, Keyword, Status), API Key Management, Log Keuangan, dan Profil User.
*   **Performa**: Seluruh operasi Read/Write metadata harus diarahkan langsung ke Supabase Client di frontend untuk mendapatkan latensi <300ms.

## 2. Storage Node Schema (Physical Files)
*   **Storage Worker**: Google Apps Script (GAS).
*   **Data yang Disimpan**: File fisik (PDF, Gambar, PPTX) dan file JSON hasil ekstraksi AI raksasa (`extracted_id.json`).
*   **Registry Node**: Setiap file yang disimpan di Google Drive harus mengembalikan `fileID` dan `nodeURL` ke Frontend untuk dicatat di registry Supabase.

## 3. Workflow Sequencing (Linear Transaction)
Untuk mencegah *Race Condition* dan data yatim (orphaned data), urutan transaksi adalah sebagai berikut:
1.  **Tahap 1 (Upload)**: Frontend mengirim file ke GAS.
2.  **Tahap 2 (Worker)**: GAS memproses file, menyimpannya di Drive, dan mengembalikan `fileID`.
3.  **Tahap 3 (Registry)**: Frontend menerima `fileID`, lalu melakukan `upsert` metadata lengkap ke **Supabase**.
4.  **Tahap 4 (UI)**: UI diperbarui menjadi "Saved" hanya setelah Supabase mengonfirmasi sukses.

## 4. Stability & Race Condition Prevention
*   **Fast Metadata Write**: Pemindahan database dari Google Sheets ke Supabase bertujuan menghilangkan *locking issue* pada baris spreadsheet.
*   **Optimistic UI**: Gunakan hook `useOptimisticUpdate` untuk perubahan status sederhana (Favorite/Bookmark).
*   **Flush on Unmount**: Pada komponen detail (seperti `TracerDetail` atau `Notebook`), implementasikan `useEffect` cleanup untuk melakukan sinkronisasi instan jika user berpindah halaman saat proses autosave masih berjalan.

## 5. Environment & Security
*   **API Keys**: Disimpan di Supabase dengan Row Level Security (RLS) aktif.
*   **GAS URL**: Tetap digunakan sebagai gateway untuk layanan Google (Slides, YouTube, Drive API).
*   **Vercel**: Sebagai host frontend yang mengorkestrasi komunikasi antara Supabase dan GAS.

## 6. Supabase Data & Query Standards
*   **Native Postgres Arrays (`TEXT[]`)**: Wajib digunakan untuk daftar string sederhana (authors, tags, keywords, collectionIds). Hal ini penting agar filter `.contains()` dari Supabase Client bekerja secara natural tanpa error sintaks JSON.
*   **JSONB Type**: Hanya digunakan untuk objek kompleks yang bersarang (seperti `themeConfig` atau `pubInfo`).
*   **Query Syntax**: Untuk kolom bertipe `TEXT[]`, pencarian dalam string query `.or()` harus menggunakan kurung kurawal (contoh: `col.cs.{val}`).
*   **Sanitasi Upsert**: Sebelum melakukan `.upsert()`, hapus kolom *generated/computed* (seperti `search_all`) di sisi frontend untuk mencegah error `428C9` (cannot insert into generated column).

## 7. Zero-Latency UX Standard (Optimistic UI)
*   **UI Sovereignity**: Interface harus merespon interaksi user (klik delete/favorite) dalam < 50ms, tanpa menunggu server.
*   **Trust-First Strategy**: Manipulasi state lokal React terlebih dahulu (hapus item dari list/update status). Asumsikan request server akan sukses.
*   **Silent Synchronization**: Operasi berat (seperti menghapus file di GAS atau update database) berjalan di *background process* (Fire-and-Forget).
*   **State Handover**: Hindari *refetch* data global setelah aksi lokal. Gunakan callback untuk mengupdate state parent secara manual.
*   **Auto Rollback**: Jika request server gagal, kembalikan state UI ke kondisi semula dan tampilkan pesan error.

---
*Protokol ini wajib diikuti oleh AI Studio saat melakukan regenerasi kode untuk menjaga konsistensi sistem Xeenaps.*