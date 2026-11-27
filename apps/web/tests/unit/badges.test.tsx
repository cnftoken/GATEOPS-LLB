import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Badge,
  GPS_TONE,
  PRESENCE_TONE,
  ACTIVITY_TONE,
  ACCOUNT_TONE,
  LINK_TONE,
} from "@/components/ui";

// 7.1: pemetaan badge status (PRD 21.4) selalu punya teks.
describe("badge mapping (PRD 21.4)", () => {
  it("kehadiran DI DALAM hijau, DI LUAR oranye", () => {
    expect(PRESENCE_TONE.DI_DALAM).toBe("success");
    expect(PRESENCE_TONE.DI_LUAR).toBe("warning");
  });

  it("GPS AKTIF/OFFLINE/TIDAK_AKTIF", () => {
    expect(GPS_TONE.AKTIF).toBe("accent");
    expect(GPS_TONE.OFFLINE).toBe("warning");
    expect(GPS_TONE.TIDAK_AKTIF).toBe("neutral");
  });

  it("aktivitas, akun, pengaitan", () => {
    expect(ACTIVITY_TONE.AKTIF).toBe("warning");
    expect(ACTIVITY_TONE.SELESAI).toBe("neutral");
    expect(ACCOUNT_TONE.AKTIF).toBe("success");
    expect(ACCOUNT_TONE.NONAKTIF).toBe("neutral");
    expect(LINK_TONE.MENUNGGU).toBe("warning");
    expect(LINK_TONE.DISETUJUI).toBe("success");
    expect(LINK_TONE.DITOLAK).toBe("danger");
  });

  it("Badge menampilkan teks (aksesibilitas)", () => {
    render(<Badge tone="success">DI DALAM</Badge>);
    expect(screen.getByText("DI DALAM")).toBeTruthy();
  });
});
