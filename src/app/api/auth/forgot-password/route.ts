import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Retorna sucesso silenciosamente para não vazar e-mails existentes
      return NextResponse.json(
        { message: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.' },
        { status: 200 }
      );
    }

    // Gerar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-senha?token=${token}`;

    const { data, error } = await resend.emails.send({
      from: 'Suporte <suporte@grandesignce.com.br>',
      to: [user.email],
      subject: 'Redefinição de Senha - Grandesign',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.5;">
          <h2 style="color: #8B5E3C; margin-bottom: 24px;">Recuperação de Senha</h2>
          <p>Olá <strong>${user.name}</strong>,</p>
          <p>Você solicitou a redefinição da sua senha no sistema da Grandesign. Clique no botão abaixo para criar uma nova senha para sua conta:</p>

          <div style="margin: 30px 0; text-align: left;">
            <a href="${resetUrl}" style="background-color: #8B5E3C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">Ou copie e cole o link abaixo no seu navegador:</p>
          <p style="color: #8B5E3C; font-size: 14px; word-break: break-all;">
            <a href="${resetUrl}" style="color: #8B5E3C; text-decoration: underline;">${resetUrl}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #E8C99A; margin: 30px 0;" />
          
          <p style="color: #999; font-size: 12px; margin-bottom: 5px;">Se você não solicitou essa redefinição, por favor ignore este e-mail.</p>
          <p style="color: #999; font-size: 12px;">Este link expira automaticamente em 24 horas.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro Resend:', error);
      return NextResponse.json({ error: 'Falha ao enviar e-mail de recuperação.' }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro na rota forgot-password:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
