import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compareHash } from "./bcrypt";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90, updateAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "email-senha",
      credentials: { email: { label: "E-mail", type: "text" }, password: { label: "Senha", type: "password" } },
      async authorize(c) {
        const email = String(c?.email || "").trim().toLowerCase();
        const pass = String(c?.password || "");
        const u = await prisma.user.findUnique({
          where: { email },
          include: { roles: { include: { role: true } } },
        });
        if (!u || !u.is_active || !u.password_hash) return null;
        const ok = await compareHash(pass, u.password_hash);
        if (!ok) return null;
        const roles = u.roles.map(r => r.role.name);
        return { id: String(u.id), name: u.name, email: u.email, roles } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { (token as any).uid = (user as any).id; (token as any).roles = (user as any).roles || []; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).id = (token as any).uid; (session.user as any).roles = (token as any).roles || []; }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
