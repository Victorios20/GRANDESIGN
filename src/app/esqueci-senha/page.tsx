"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao solicitar recuperação de senha.");
      } else {
        toast.success(data.message || "Link enviado com sucesso.");
        setSuccess(true);
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
              <CardTitle className="text-2xl font-bold text-balance">Esqueci minha senha</CardTitle>
              <CardDescription className="text-base text-pretty">
                Informe seu e-mail para receber um link de redefinição.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {success ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Verifique sua caixa de entrada e, se necessário, a pasta de spam. O link ficará válido por 24 horas.
                  </p>
                  <Button className="w-full h-11" variant="outline" onClick={() => router.push("/login")}>
                    Voltar para o Login
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={onSubmit}>
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
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium mt-6"
                    disabled={loading}
                    variant="success"
                  >
                    {loading ? "Enviando..." : "Enviar Link"}
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
