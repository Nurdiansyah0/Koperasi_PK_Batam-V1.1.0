const fs = require('fs');
let code = fs.readFileSync('frontend/src/types/index.ts', 'utf8');

const rekapBarangInterface = `export interface RekapBarang {
  barang_id: number
  nama_barang: string
  qty_terjual: number
  revenue: number
  historical_hpp: number
  gross_profit: number
}

export interface LaporanResponse {`;

code = code.replace(/export interface LaporanResponse \{/, rekapBarangInterface);
code = code.replace(/rekap_bulanan: RekapBulanan\[\]/, "rekap_bulanan: RekapBulanan[]\n  rekap_barang: RekapBarang[]");

fs.writeFileSync('frontend/src/types/index.ts', code);
