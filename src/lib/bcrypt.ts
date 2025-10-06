import bcrypt from "bcryptjs";
export function hashPassword(p: string) { return bcrypt.hash(p, 10); }
export function compareHash(p: string, h: string) { return bcrypt.compare(p, h); }
