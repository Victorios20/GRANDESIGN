import "next-auth";
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      roles: string[];
      modules: string[];
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    roles: string[];
    modules: string[];
  }
}
