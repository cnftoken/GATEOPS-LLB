// Tipe role & otorisasi murni (PRD 4.2, 22.5). Tanpa dependensi eksternal.
export type Role = "SUPER_ADMIN" | "KOMANDAN" | "PERSONEL" | "PERSIT";

// Tanpa roles berarti semua role diizinkan.
export function roleAllowed(roles: Role[] | undefined, role: Role): boolean {
  return !roles || roles.includes(role);
}
