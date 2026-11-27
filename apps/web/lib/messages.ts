// Pesan teks UI (PRD). Identifier Bahasa Inggris, tampilan Bahasa Indonesia.
// Peta kode galat server (PRD 22.4) ke pesan yang aman ditampilkan (AGENTS 8.4).

export const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  VALIDATION_FAILED: "Data yang dimasukkan tidak valid.",
  FORM_INCOMPLETE: "Tujuan dan keperluan wajib diisi.",
  UNAUTHENTICATED: "Sesi berakhir. Silakan masuk kembali.",
  SESSION_EXPIRED: "Sesi berakhir. Silakan masuk kembali.",
  FORBIDDEN: "Anda tidak memiliki akses untuk tindakan ini.",
  MUST_CHANGE_PASSWORD: "Anda wajib mengganti password terlebih dahulu.",
  ACCOUNT_INACTIVE: "Akun Anda tidak aktif.",
  NOT_FOUND: "Data tidak ditemukan.",
  CONFLICT: "Data sudah digunakan atau sedang berubah.",
  NOT_OUT: "Anda tidak sedang DI LUAR.",
  TRANSACTION_IN_PROGRESS: "Transaksi lain sedang berjalan. Coba lagi.",
  INVALID_QR: "QR Gate tidak valid atau tidak dikenal. silahkan pindai lagi",
  GATE_INACTIVE: "Gate tidak aktif.",
  PERSONNEL_NOT_FOUND: "NRP personel tidak ditemukan.",
  REPORT_TOO_LARGE: "Laporan terlalu besar (maksimal 5.000 baris).",
  RATE_LIMITED: "Akun terkunci sementara. Coba lagi nanti.",
  TRANSACTION_FAILED: "Transaksi gagal. Silakan coba lagi.",
  INTERNAL_ERROR: "Terjadi kesalahan. Silakan coba lagi.",
};

export const NETWORK_ERROR_MESSAGE = "Koneksi terputus. Periksa jaringan Anda, lalu coba lagi.";

export const MESSAGES = {
  LOGIN_TITLE: "Masuk",
  LOGIN_SUCCESS: "Berhasil masuk.",
  LOGOUT_SUCCESS: "Berhasil keluar.",
  PASSWORD_CHANGED: "Password berhasil diubah.",
  PASSWORD_RESET: "Password sementara berhasil dibuat.",
  SCAN_HINT: "Arahkan kamera ke QR Code gate.",
  CAMERA_DENIED: "Akses kamera ditolak. Izinkan kamera di pengaturan perangkat.",
  GPS_PERMISSION_DENIED: "Akses lokasi ditolak. Aktifkan izin lokasi untuk berbagi posisi.",
} as const;

export function messageForCode(code: string): string {
  return ERROR_MESSAGES[code] ?? "Terjadi kesalahan. Silakan coba lagi.";
}
