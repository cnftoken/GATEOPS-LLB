// Tipe sesi dan role (PRD 4.2). Nilai enum UPPER_SNAKE_CASE (AGENTS 8.1).
export type Role = "SUPER_ADMIN" | "KOMANDAN" | "PERSONEL" | "PERSIT";

export interface Me {
  id: string;
  role: Role;
  username: string;
  nama: string;
  mustChangePassword: boolean;
}

export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  SUPER_ADMIN: "Super Admin",
  KOMANDAN: "Komandan",
  PERSONEL: "Personel",
  PERSIT: "Persit",
};

// Beranda default per role (PRD 20.2).
export function homeForRole(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "KOMANDAN":
      return "/komando";
    case "PERSONEL":
      return "/beranda";
    case "PERSIT":
      return "/keluarga";
  }
}
