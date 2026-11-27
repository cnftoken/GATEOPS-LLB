// Pesan teks server yang ditetapkan PRD. Harus persis sama (AGENTS 8.7, 12.15).
// Dipakai Edge Functions. Dibandingkan dengan UI messages oleh tes (To-dos 7.7).

export const MESSAGES = {
  USERNAME_ALREADY_USED: "Username sudah digunakan.",
  LOGIN_INVALID: "Username atau password salah.",
  LOGIN_LOCKED: "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.",
  LOGIN_INACTIVE: "Akun tidak aktif. Hubungi Super Admin.",
  LOGIN_EMPTY: "Username dan password wajib diisi.",
  INVALID_QR: "QR Gate tidak valid atau tidak dikenal. silahkan pindai lagi",
  GATE_INACTIVE: "Gate sedang NONAKTIF. Transaksi tidak dapat diproses.",
  FORM_INCOMPLETE: "Tujuan dan keperluan wajib diisi.",
  NRP_NOT_REGISTERED: "NRP tidak terdaftar pada data personel.",
  PERSIT_REGISTERED:
    "Registrasi berhasil. Tunggu verifikasi Super Admin sebelum login untuk melihat status personel.",
} as const;

export type MessageKey = keyof typeof MESSAGES;

// Kode galat API -> pesan default bila PRD menetapkan teksnya (PRD 22.4).
export const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  INVALID_QR: MESSAGES.INVALID_QR,
  GATE_INACTIVE: MESSAGES.GATE_INACTIVE,
  FORM_INCOMPLETE: MESSAGES.FORM_INCOMPLETE,
  ACCOUNT_INACTIVE: MESSAGES.LOGIN_INACTIVE,
  RATE_LIMITED: MESSAGES.LOGIN_LOCKED,
  UNAUTHENTICATED: MESSAGES.LOGIN_INVALID,
  USERNAME_ALREADY_USED: MESSAGES.USERNAME_ALREADY_USED,
  NRP_NOT_REGISTERED: MESSAGES.NRP_NOT_REGISTERED,
};
