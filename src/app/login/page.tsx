"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast, Toaster } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/";

  const [loading, setLoading] = useState(false);
  const [errLogin, setErrLogin] = useState<string | null>(null);
  const [errRegister, setErrRegister] = useState<string | null>(null);

  const [showPwdLogin, setShowPwdLogin] = useState(false);
  const [showPwdReg, setShowPwdReg] = useState(false);
  const [showPwdRegConf, setShowPwdRegConf] = useState(false);

  async function onSubmitLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrLogin(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const remember = form.get("remember") ? true : false;

    const res = await signIn("credentials", {
      email,
      password,
      remember,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res || res.error) {
      setErrLogin("E-mail ou senha inválidos.");
      toast.error("Falha no login. Verifique suas credenciais.");
      return;
    }

    toast.success("Bem-vindo! Redirecionando…");
    router.push(res.url || callbackUrl);
  }

  async function onSubmitRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrRegister(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (!name || !email || !password) {
      setErrRegister("Preencha todos os campos.");
      toast.error("Preencha todos os campos.");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setErrRegister("As senhas não conferem.");
      toast.error("As senhas não conferem.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setErrRegister("A senha deve ter pelo menos 8 caracteres.");
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      setLoading(false);
      return;
    }

    const resp = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      const msg = data?.error || "Não foi possível criar sua conta.";
      setErrRegister(msg);
      toast.error(msg);
      setLoading(false);
      return;
    }

    toast.success("Conta criada! Entrando…");

    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);

    if (!res || res.error) {
      setErrRegister("Conta criada, mas houve erro ao entrar. Tente fazer login.");
      toast.error("Conta criada, mas houve erro ao entrar. Faça login.");
      return;
    }

    router.push(res.url || callbackUrl);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Toaster richColors position="top-right" closeButton />
      {/* Form Column - Left Side */}
      <div className="flex-1 lg:w-[40%] flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="Logo GRANDESIGN" width={48} height={48} className="object-contain" />
            <span className="text-2xl font-semibold tracking-tight text-bege">GRANDESIGN</span>
          </div>

          {/* Card with Forms */}
          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold text-balance">Acesse sua conta</CardTitle>
              <CardDescription className="text-base text-pretty">
                Gestão e Acompanhamento de Obras
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Cadastrar</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
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
                        <Checkbox id="remember" name="remember" />
                        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                          Manter conectado
                        </Label>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          toast.info("Recuperação de senha em breve. Fale com o suporte para redefinir por enquanto.")
                        }
                        className="text-sm text-muted-foreground underline underline-offset-2 hover:opacity-80"
                      >
                        Esqueci minha senha
                      </button>
                    </div>

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
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <form data-testid="register-form" className="space-y-4" onSubmit={onSubmitRegister}>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" name="name" type="text" placeholder="Seu nome completo" required className="h-11" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg_email">E-mail</Label>
                      <Input
                        id="reg_email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        required
                        className="h-11"
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg_password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="reg_password"
                          name="password"
                          type={showPwdReg ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          className="h-11 pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          aria-label={showPwdReg ? "Ocultar senha" : "Mostrar senha"}
                          aria-pressed={showPwdReg}
                          onClick={() => setShowPwdReg((v) => !v)}
                          className="absolute inset-y-0 right-2 flex items-center justify-center px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
                        >
                          {showPwdReg ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg_confirm">Confirmar senha</Label>
                      <div className="relative">
                        <Input
                          id="reg_confirm"
                          name="confirmPassword"
                          type={showPwdRegConf ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          className="h-11 pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          aria-label={showPwdRegConf ? "Ocultar senha" : "Mostrar senha"}
                          aria-pressed={showPwdRegConf}
                          onClick={() => setShowPwdRegConf((v) => !v)}
                          className="absolute inset-y-0 right-2 flex items-center justify-center px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
                        >
                          {showPwdRegConf ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ao criar sua conta, você será cadastrado com a função padrão de{" "}
                      <span className="font-medium text-foreground">VENDEDOR</span>.
                    </p>

                    {errRegister ? <p className="text-sm text-red-600">{errRegister}</p> : null}

                    <Button
                      type="submit"
                      data-testid="register-submit"
                      className="w-full h-11 text-base font-medium"
                      disabled={loading}
                      variant="success"
                    >
                      {loading ? "Criando..." : "Criar conta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter>
              <p className="text-xs text-center text-muted-foreground leading-relaxed w-full">
                Ao continuar, você concorda com nossos termos de serviço e política de privacidade.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Image Column - Right Side */}
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
