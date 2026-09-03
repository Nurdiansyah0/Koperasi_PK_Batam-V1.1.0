# Business Rules Reference — Koperasi PK

## Tarik Tunai

### Syarat Kelayakan
1. `shu_distribusi.status = 'approved'`
2. Total pembelian periode berjalan ≥ Rp 25.000
3. Tidak ada hutang aktif (`anggota.hutang > 0` → ditolak)
4. Nominal ≤ batas proporsional SHU
5. Tidak ada tarik tunai pending sebelumnya

### Alur Status
```
draft → pending → approved → completed
                → rejected
```
Saat rejected: kembalikan SHU + refund stok transaksi terkait.

---

## SHU (Sisa Hasil Usaha)

- Distribusi per anggota berdasarkan partisipasi transaksi
- Status: `pending → approved → paid`
- Konversi individual: admin → satu anggota ke wallet
- Mass convert: semua anggota sekaligus (khusus Hari Raya)
- Offset hutang: SHU bisa bayar hutang anggota otomatis
- **Wajib**: clear cache kasir setelah konversi SHU

---

## Stok Dua Tingkat

| Kolom | Keterangan |
|---|---|
| `stok_toko` | Stok kasir aktif, langsung berkurang saat transaksi |
| `stok_gudang` | Stok cadangan, tidak langsung terpakai |

- `stok_toko` tidak boleh < 0 — validasi wajib di setiap transaksi
- Auto-refill: stok_toko habis → pindah dari gudang otomatis
- Opname: reconcile stok fisik vs sistem
- Expiry tracking: barang kadaluarsa bisa di-write-off

---

## Serah Terima Kasir

```
Kasir Penyerah → buat draft (rekap stok + kas)
Kasir Penerima → approve / reject
```
Data yang transfer: jumlah kas, selisih, tanggung jawab stok toko.

---

## Kasir & POS

| Tipe Transaksi | Keterangan |
|---|---|
| `tunai` | Bayar langsung, stok langsung berkurang |
| `hutang` | Ditangguhkan, tambah hutang anggota |
| `pesanan` | Order online anggota, kasir approve/tolak |

Jika pesanan ditolak: stok dikembalikan + tarik tunai terkait direfund + notifikasi WebPush.

---

## Jabatan & Admin Lock

- Minimal 1 admin aktif harus ada di sistem
- Hapus/demote admin terakhir → ditolak sistem
- Jabatan: ketua, sekretaris, bendahara, dll — bisa mandat ke anggota lain
