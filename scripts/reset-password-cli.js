#!/usr/bin/env node
/**
 * Gera hash de senha e snippets SQL para aplicar manualmente no banco.
 *
 * Uso:
 *   node scripts/reset-password-cli.js --password "NovaSenha123!" --email user@exemplo.com --user-id 42
 *
 * Saídas:
 * - hash pronto para salvar em users.password_hash
 * - SQL de UPDATE por e-mail (se informado)
 * - SQL de INSERT em password_reset_tokens (se passar --user-id)
 */
import bcrypt from "bcryptjs"
import { randomBytes } from "node:crypto"

const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.findIndex(a => a === name)
  return i >= 0 ? args[i + 1] : undefined
}

const password = getArg("--password") || getArg("-p")
const email = getArg("--email") || getArg("-e")
const userId = getArg("--user-id") || getArg("-u")

if (!password) {
  console.error("Erro: informe --password \"NovaSenha123!\"")
  process.exit(1)
}

async function main() {
  const hash = await bcrypt.hash(password, 10) // mesma config de hashPassword()
  console.log("Senha informada:", password)
  console.log("Hash gerado:", hash)
  console.log("")

  if (email) {
    console.log("SQL para atualizar pelo e-mail:")
    console.log(
      `UPDATE public.users SET password_hash='${hash}' WHERE email='${email.toLowerCase()}';`
    )
    console.log("")
  }

  if (userId) {
    const token = randomBytes(16).toString("hex")
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString() // expira em 2h
    console.log("Token gerado (para referência ou uso em password_reset_tokens):", token)
    console.log("SQL para inserir token manualmente:")
    console.log(
      `INSERT INTO public.password_reset_tokens (user_id, token, expires_at) VALUES (${userId}, '${token}', '${expires}');`
    )
    console.log("")
  }

  console.log("Dica: confirme que o UPDATE afetou 1 linha e limpe tokens antigos se precisar.")
}

main().catch(err => {
  console.error("Falha ao gerar hash/token:", err)
  process.exit(1)
})
