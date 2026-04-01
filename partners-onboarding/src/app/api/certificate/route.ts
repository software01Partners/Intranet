import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { jsPDF } from 'jspdf';

const certificateSchema = z.object({
  trailId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { trailId } = certificateSchema.parse(body);

    const admin = createAdminClient();

    // Buscar dados do usuário
    const { data: userData } = await admin
      .from('users')
      .select('id, name, email')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar trilha (somente ativa)
    const { data: trail } = await admin
      .from('trails')
      .select('id, name, duration')
      .eq('id', trailId)
      .is('deleted_at', null)
      .single();

    if (!trail) {
      return NextResponse.json({ error: 'Trilha não encontrada' }, { status: 404 });
    }

    // Buscar módulos
    const { data: modules } = await admin
      .from('modules')
      .select('id')
      .eq('trail_id', trailId)
      .is('deleted_at', null);

    if (!modules || modules.length === 0) {
      return NextResponse.json({ error: 'Módulos não encontrados' }, { status: 404 });
    }

    // Verificar se TODOS os módulos estão completos
    const moduleIds = modules.map((m) => m.id);
    const { data: userProgress } = await admin
      .from('user_progress')
      .select('module_id, completed')
      .eq('user_id', user.id)
      .in('module_id', moduleIds);

    const allCompleted = modules.every((module) => {
      const progress = userProgress?.find((up) => up.module_id === module.id);
      return progress?.completed === true;
    });

    if (!allCompleted) {
      return NextResponse.json({ error: 'Trilha não concluída' }, { status: 400 });
    }

    // Verificar/criar certificado
    const { data: existingCertificate } = await admin
      .from('certificates')
      .select('id, issued_at')
      .eq('user_id', user.id)
      .eq('trail_id', trailId)
      .single();

    let issuedAt: Date;
    if (existingCertificate) {
      issuedAt = new Date(existingCertificate.issued_at);
    } else {
      issuedAt = new Date();
      await admin.from('certificates').insert({
        user_id: user.id,
        trail_id: trailId,
        issued_at: issuedAt.toISOString(),
      });
    }

    // ========== GERAR PDF BONITO ==========
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const W = doc.internal.pageSize.getWidth();   // 297
    const H = doc.internal.pageSize.getHeight();   // 210
    const cx = W / 2; // centro X

    // Cores da marca Partners
    const purple = '#6B2FA0';
    const gold = '#F5A623';
    const dark = '#2D2A26';
    const gray = '#7A7468';

    // ── Fundo branco (padrão) ──

    // ── Borda externa decorativa (roxo) ──
    doc.setDrawColor(purple);
    doc.setLineWidth(2.5);
    doc.rect(8, 8, W - 16, H - 16);

    // ── Borda interna (dourada) ──
    doc.setDrawColor(gold);
    doc.setLineWidth(0.8);
    doc.rect(13, 13, W - 26, H - 26);

    // ── Cantos decorativos (pequenos losangos dourados) ──
    doc.setFillColor(gold);
    const corners = [
      [13, 13], [W - 13, 13], [13, H - 13], [W - 13, H - 13],
    ];
    corners.forEach(([x, y]) => {
      doc.circle(x, y, 2, 'F');
    });

    // ── Linha decorativa horizontal superior ──
    const lineY = 50;
    doc.setDrawColor(gold);
    doc.setLineWidth(0.4);
    doc.line(50, lineY, cx - 40, lineY);
    doc.line(cx + 40, lineY, W - 50, lineY);

    // ── Ícone decorativo central (losango) ──
    doc.setFillColor(gold);
    doc.circle(cx, lineY, 1.5, 'F');

    // ── "Partners" (marca) ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(purple);
    doc.text('Partners', cx, 38, { align: 'center' });

    // ── Subtítulo "Comunicação Integrada" ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(gray);
    doc.text('Comunicação Integrada', cx, 44, { align: 'center' });

    // ── CERTIFICADO DE CONCLUSÃO ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(dark);
    doc.text('CERTIFICADO DE CONCLUSÃO', cx, 65, { align: 'center' });

    // ── Linha decorativa abaixo do título ──
    doc.setDrawColor(gold);
    doc.setLineWidth(0.6);
    doc.line(cx - 50, 69, cx + 50, 69);

    // ── "Certificamos que" ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(gray);
    doc.text('Certificamos que', cx, 82, { align: 'center' });

    // ── Nome do colaborador ──
    const userName = userData.name || userData.email.split('@')[0];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(purple);
    doc.text(userName, cx, 96, { align: 'center' });

    // ── Linha embaixo do nome ──
    const nameWidth = doc.getTextWidth(userName);
    doc.setDrawColor(gold);
    doc.setLineWidth(0.4);
    doc.line(cx - nameWidth / 2 - 5, 99, cx + nameWidth / 2 + 5, 99);

    // ── "concluiu com sucesso a trilha" ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(gray);
    doc.text('concluiu com sucesso a trilha', cx, 112, { align: 'center' });

    // ── Nome da trilha ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(gold);
    doc.text(trail.name, cx, 125, { align: 'center' });

    // ── Carga horária ──
    if (trail.duration && trail.duration > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(gray);
      const durationText = trail.duration >= 60
        ? `Carga horária: ${Math.floor(trail.duration / 60)}h${trail.duration % 60 > 0 ? ` ${trail.duration % 60}min` : ''}`
        : `Carga horária: ${trail.duration} minutos`;
      doc.text(durationText, cx, 134, { align: 'center' });
    }

    // ── Data de conclusão ──
    const formattedDate = issuedAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(dark);
    doc.text(`Emitido em ${formattedDate}`, cx, 150, { align: 'center' });

    // ── Linha de assinatura ──
    const sigY = 170;
    doc.setDrawColor(gray);
    doc.setLineWidth(0.3);
    doc.line(cx - 40, sigY, cx + 40, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(gray);
    doc.text('Partners — Plataforma de Onboarding', cx, sigY + 5, { align: 'center' });

    // ── ID do certificado (rodapé discreto) ──
    const certId = existingCertificate?.id || 'novo';
    doc.setFontSize(7);
    doc.setTextColor('#B0A99E');
    doc.text(`ID: ${certId}`, cx, H - 12, { align: 'center' });

    // Converter PDF para buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-${trail.name.replace(/\s+/g, '-')}-${userName.replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar certificado:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
