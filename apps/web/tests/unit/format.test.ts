import { describe, it, expect } from "vitest";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";

describe("format (PRD 4.7)", () => {
  it("4.7.3 formats date and time in device timezone", () => {
    const date = new Date(2026, 10, 25, 17, 40, 0);
    expect(formatDateTime(date)).toBe("25 November 2026, 17:40");
  });

  it("4.7.4 formats duration of one hour or more", () => {
    expect(formatDuration(3600)).toBe("1 jam 0 menit");
    expect(formatDuration(3600 + 25 * 60 + 59)).toBe("1 jam 25 menit");
  });

  it("4.7.4 formats duration under one hour and floors to minutes", () => {
    expect(formatDuration(59)).toBe("0 menit");
    expect(formatDuration(25 * 60 + 59)).toBe("25 menit");
  });

  it("4.7.5 formats numbers with dot thousands separators", () => {
    expect(formatNumber(1250)).toBe("1.250");
    expect(formatNumber(1000000)).toBe("1.000.000");
  });
});
