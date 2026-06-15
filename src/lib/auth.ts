import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compareHash } from "./bcrypt";
import { resolveEffectiveModuleKeys } from "./access/resolve.server";

const SECONDS_12H = 60 * 60 * 12;
const SECONDS_7D = 60 * 60 * 24 * 7;

function parseRemember(v: unknown): boolean {
  const s = String(v ?? "").toLowerCase();
  return s === "true" || s === "on" || s === "1" || s === "yes";
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SECONDS_7D },
  jwt: { maxAge: SECONDS_7D },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "email-senha",
      credentials: {
        email: { label: "E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
        remember: { label: "Manter-me conectado", type: "text" }
      },
      async authorize(c) {
        const email = String(c?.email || "").trim().toLowerCase();
        const pass = String(c?.password || "");
        const remember = parseRemember((c as any)?.remember);
        const u = await prisma.user.findUnique({
          where: { email },
          include: { roles: { include: { role: true } } }
        });
        if (!u || !u.is_active || !u.password_hash) return null;
        const ok = await compareHash(pass, u.password_hash);
        if (!ok) return null;

        const roles = u.roles.map(r => r.role.name);
        return { id: String(u.id), name: u.name, email: u.email, roles, remember } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const roles = (user as any).roles || [];
        (token as any).uid = (user as any).id;
        (token as any).roles = roles;
        (token as any).modules = await resolveEffectiveModuleKeys((user as any).id, roles);
        const remember = (user as any).remember === true;
        const ttl = remember ? SECONDS_7D : SECONDS_12H;
        (token as any).exp = Math.floor(Date.now() / 1000) + ttl;
        return token;
      }

      if (!(token as any).roles || (Array.isArray((token as any).roles) && (token as any).roles.length === 0)) {
        if (token?.email) {
          const u = await prisma.user.findUnique({
            where: { email: token.email },
            include: { roles: { include: { role: true } } },
          });
          (token as any).roles = u ? u.roles.map(r => r.role.name) : [];
          (token as any).uid = (token as any).uid ?? (u ? String(u.id) : undefined);
        } else {
          (token as any).roles = [];
        }
      }

      // Backfill para sessões emitidas antes do controle de acesso por módulo.
      if ((token as any).modules === undefined) {
        (token as any).modules = await resolveEffectiveModuleKeys(
          (token as any).uid,
          (token as any).roles || []
        );
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).uid;
        (session.user as any).roles = (token as any).roles || [];
        (session.user as any).modules = (token as any).modules || [];
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
