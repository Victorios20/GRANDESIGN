"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function ResetSenhaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!token) {
      toast.error("Token de redefinição não encontrado na URL.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao redefinir senha.");
      } else {
        toast.success(data.message || "Senha alterada com sucesso!");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      toast.error("Erro interno. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
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
              <CardTitle className="text-2xl font-bold text-balance">Criar nova senha</CardTitle>
              <CardDescription className="text-base text-pretty">
                Informe a sua nova senha abaixo.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!token ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-red-600">Link inválido ou expirado.</p>
                  <Button className="w-full h-11" variant="outline" onClick={() => router.push("/esqueci-senha")}>
                    Solicitar novo link
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPwd ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute inset-y-0 right-2 flex items-center justify-center px-2 outline-none rounded-md"
                      >
                        {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPwd ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((v) => !v)}
                        className="absolute inset-y-0 right-2 flex items-center justify-center px-2 outline-none rounded-md"
                      >
                        {showConfirmPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium mt-6"
                    disabled={loading}
                    variant="success"
                  >
                    {loading ? "Salvando..." : "Salvar Nova Senha"}
                  </Button>
                  <div className="text-center pt-4">
                    <Link href="/login" className="text-sm text-muted-foreground hover:underline">
                      Voltar para o Login
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="relative h-64 lg:h-auto lg:flex-1 lg:w-[60%]">
        <Image src="/images/login-hero.jpg" alt="Arquitetura" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-foreground/10 to-transparent" />
      </div>
    </div>
  );
}
