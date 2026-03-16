import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token e nova senha são obrigatórios.' }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 });
    }

    if (resetToken.used_at) {
      return NextResponse.json({ error: 'Este link de redefinição já foi utilizado.' }, { status: 400 });
    }

    if (new Date() > resetToken.expires_at) {
      return NextResponse.json({ error: 'O link de redefinição expirou.' }, { status: 400 });
    }

    // Gerar o hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atualizar o banco via Transação para garantir consistência
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.user_id },
        data: { password_hash: hashedPassword, updated_at: new Date() },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used_at: new Date() },
      })
    ]);

    return NextResponse.json({ message: 'Senha redefinida com sucesso!' }, { status: 200 });
  } catch (error) {
    console.error('Erro na rota reset-password:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
