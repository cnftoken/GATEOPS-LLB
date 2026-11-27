import { describe, it, expect } from "vitest";
import { ERROR_MESSAGES, MESSAGES, NETWORK_ERROR_MESSAGE, messageForCode } from "@/lib/messages";

// 7.7: pesan UI harus persis sama dengan PRD (AGENTS 10.3). Ejaan "silahkan" dipertahankan.
describe("messages UI vs PRD (7.7)", () => {
  it("INVALID_QR memakai ejaan PRD persis", () => {
    expect(ERROR_MESSAGES.INVALID_QR).toBe(
      "QR Gate tidak valid atau tidak dikenal. silahkan pindai lagi",
    );
  });

  it("FORM_INCOMPLETE sesuai PRD 10.2", () => {
    expect(ERROR_MESSAGES.FORM_INCOMPLETE).toBe("Tujuan dan keperluan wajib diisi.");
  });

  it("NETWORK_ERROR_MESSAGE sesuai PRD 21.5", () => {
    expect(NETWORK_ERROR_MESSAGE).toBe("Koneksi terputus. Periksa jaringan Anda, lalu coba lagi.");
  });

  it("kode tak dikenal -> pesan fallback aman", () => {
    expect(messageForCode("UNKNOWN_CODE")).toBe("Terjadi kesalahan. Silakan coba lagi.");
  });

  it("PASSWORD_CHANGED tersedia untuk toast", () => {
    expect(MESSAGES.PASSWORD_CHANGED).toBe("Password berhasil diubah.");
  });
});
