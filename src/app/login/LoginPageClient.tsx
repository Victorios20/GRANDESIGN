"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast, Toaster } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const LS_KEY_KEEP_LOGGED = "gd_keep_logged";

export default function LoginPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/";

  const [loading, setLoading] = useState(false);
  const [errLogin, setErrLogin] = useState<string | null>(null);
  const [showPwdLogin, setShowPwdLogin] = useState(false);
  const [keepLogged, setKeepLogged] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY_KEEP_LOGGED);
      setKeepLogged(saved === "1");
    } catch {
      /* ignore */
    }
  }, []);

  async function onSubmitLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrLogin(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");

    const res = await signIn("credentials", {
      email,
      password,
      remember: keepLogged,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res || res.error) {
      setErrLogin("E-mail ou senha inválidos.");
      toast.error("Falha no login. Verifique suas credenciais.");
      return;
    }

    try {
      localStorage.setItem(LS_KEY_KEEP_LOGGED, keepLogged ? "1" : "0");
    } catch {
      /* ignore */
    }

    toast.success("Bem-vindo! Redirecionando…");
    router.push(res.url || callbackUrl);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Toaster richColors position="top-right" />
      <div className="flex-1 lg:w-[40%] flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="Logo GRANDESIGN" width={48} height={48} className="object-contain" />
            <span className="text-2xl font-semibold tracking-tight text-marromEscuro">GRANDESIGN</span>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold text-balance">Acesse sua conta</CardTitle>
              <CardDescription className="text-base text-pretty">
                Gestão e Acompanhamento de Obras
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form data-testid="login-form" className="space-y-4" onSubmit={onSubmitLogin}>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    className="h-11"
                    autoComplete="email"
                    onInvalid={() => toast.info("Informe um e-mail válido.")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPwdLogin ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      className="h-11 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      aria-label={showPwdLogin ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPwdLogin}
                      onClick={() => setShowPwdLogin((v) => !v)}
                      className="absolute inset-y-0 right-2 flex items-center justify-center px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
                    >
                      {showPwdLogin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={keepLogged}
                      onCheckedChange={(v) => setKeepLogged(v === true)}
                      aria-describedby="remember-help"
                    />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                      Manter conectado
                    </Label>
                  </div>
                  <Link
                    href="/esqueci-senha"
                    className="text-sm text-muted-foreground underline underline-offset-2 hover:opacity-80"
                  >
                    Esqueci minha senha
                  </Link>
                </div>

                {/* opcional: dica de duração */}
                <p id="remember-help" className="text-xs text-muted-foreground">
                  Marcado: sessão de 7 dias. Desmarcado: 12 horas.
                </p>

                {errLogin ? <p className="text-sm text-red-600">{errLogin}</p> : null}

                <Button
                  type="submit"
                  data-testid="login-submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading}
                  variant="success"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>

            <CardFooter>
              <p className="text-xs text-center text-muted-foreground leading-relaxed w-full">
                Ao continuar, você concorda com nossos termos de serviço e política de privacidade.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="relative h-64 lg:h-auto lg:flex-1 lg:w-[60%]">
        <Image src="/images/login-hero.jpg" alt="Arquitetura em madeira GRANDESIGN" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-foreground/10 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8">
          <p className="text-white text-lg lg:text-xl font-medium drop-shadow-lg text-balance">
            Grand Design — eficiência e precisão
          </p>
        </div>
      </div>
    </div>
  );
}
