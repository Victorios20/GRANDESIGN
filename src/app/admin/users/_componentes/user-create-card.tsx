"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";

type RoleItem = {
  id: number;
  name: "ADMIN" | "DEV" | "VENDEDOR" | "VISITANTE" | (string & {});
  label: string;
};

type Props = {
  allRoles: RoleItem[];
  onCreated?: () => void; // para fechar o modal lá no users-table
};

export default function UserCreateCard({ allRoles, onCreated }: Props) {
  const router = useRouter();

  const defaultRole = useMemo(() => {
    const v = allRoles.find((r) => r.name === "VISITANTE");
    return v?.name ?? (allRoles[0]?.name || "");
  }, [allRoles]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(defaultRole);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwdConf, setShowPwdConf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setErrMsg(null);

  const n = name.trim();
  const m = email.trim().toLowerCase();
  const p = password;

  if (!n || !m || !p || !confirm) { setErrMsg("Preencha todos os campos."); toast.error("Preencha todos os campos."); return; }
  if (p !== confirm) { setErrMsg("As senhas não conferem."); toast.error("As senhas não conferem."); return; }
  if (p.length < 8) { setErrMsg("A senha deve ter pelo menos 8 caracteres."); toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
  if (!role) { setErrMsg("Selecione uma role."); toast.error("Selecione uma role."); return; }

  setBusy(true);
  try {
    // Agora enviando role no POST
    const resp = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n, email: m, password: p, role }),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      const msg =
        (resp.status === 401 && "Cadastro público está bloqueado. Verifique suas permissões.") ||
        (resp.status === 409 && "Já existe uma conta com este e-mail.") ||
        (resp.status === 422 && (data?.error || "Role informada é inválida.")) ||
        (resp.status === 400 && (data?.error || "Dados inválidos. Corrija e tente novamente.")) ||
        data?.error || "Não foi possível criar o usuário.";
      setErrMsg(msg);
      toast.error(msg);
      return;
    }

    const createdId: number | null = data?.id ?? data?.user?.id ?? null;
    const applied = (data?.role_aplicada as string | null) ?? null;

    // Fallback: se backend não aplicou a role solicitada, força via endpoint de roles
    if (createdId && (!applied || applied !== role)) {
      const r = await fetch(`/api/admin/users/${createdId}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: [role] }),
      });
      if (!r.ok) {
        toast.warning("Usuário criado, mas não foi possível aplicar a role automaticamente.");
      }
    }

    toast.success(`Usuário cadastrado${role ? ` como ${role}` : ""}.`);
    setName(""); setEmail(""); setPassword(""); setConfirm(""); setRole(defaultRole);
    router.refresh();
    onCreated?.();
  } catch {
    setErrMsg("Falha ao cadastrar usuário.");
    toast.error("Falha ao cadastrar usuário.");
  } finally {
    setBusy(false);
  }
}


  return (
    <Card className="mx-auto w-full max-w-md border-border shadow-lg">
      <Toaster richColors position="top-right" />
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold text-balance text-marromEscuro">Cadastrar novo usuário</CardTitle>
        <CardDescription className="text-base text-pretty text-marromClaro">
          Crie usuários internos e defina a permissão no ato do cadastro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" className="h-11" disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="h-11" autoComplete="email" disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole} disabled={busy}>
              <SelectTrigger className="h-11 border-marromClaro text-marromEscuro">
                <SelectValue placeholder="Selecionar role" />
              </SelectTrigger>
              <SelectContent>
                {allRoles.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <span className="text-marromEscuro">{r.label}</span>
                      <span className="text-xs text-marromClaro">{r.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 pr-10"
                autoComplete="new-password"
                disabled={busy}
              />
              <button
                type="button"
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPwd}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute inset-y-0 right-2 flex items-center justify-center px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showPwdConf ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="h-11 pr-10"
                autoComplete="new-password"
                disabled={busy}
              />
              <button
                type="button"
                aria-label={showPwdConf ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPwdConf}
                onClick={() => setShowPwdConf((v) => !v)}
                className="absolute inset-y-0 right-2 flex items-center justify-center px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
              >
                {showPwdConf ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {errMsg ? <p className="text-sm text-red-600">{errMsg}</p> : null}
          <Button type="submit" className="w-full h-11 text-base font-medium" disabled={busy} variant="success">
            {busy ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-center text-muted-foreground leading-relaxed w-full">
          O usuário será criado e terá a role selecionada aplicada automaticamente (se você for ADMIN).
        </p>
      </CardFooter>
    </Card>
  );
}
