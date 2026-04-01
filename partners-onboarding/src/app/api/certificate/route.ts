import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { jsPDF } from 'jspdf';

const certificateSchema = z.object({
  trailId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Validar body
    const body = await request.json();
    const { trailId } = certificateSchema.parse(body);

    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Buscar trilha e todos os módulos
    const { data: trail, error: trailError } = await supabase
      .from('trails')
      .select('id, name, duration')
      .eq('id', trailId)
      .single();

    if (trailError || !trail) {
      return NextResponse.json(
        { error: 'Trilha não encontrada' },
        { status: 404 }
      );
    }

    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id')
      .eq('trail_id', trailId);

    if (modulesError || !modules || modules.length === 0) {
      return NextResponse.json(
        { error: 'Módulos não encontrados' },
        { status: 404 }
      );
    }

    // Buscar progresso do usuário para todos os módulos
    const moduleIds = modules.map((m) => m.id);
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('module_id, completed')
      .eq('user_id', user.id)
      .in('module_id', moduleIds);

    if (progressError) {
      return NextResponse.json(
        { error: 'Erro ao buscar progresso' },
        { status: 500 }
      );
    }

    // Verificar se TODOS os módulos estão completos
    const allCompleted = modules.every((module) => {
      const progress = userProgress?.find((up) => up.module_id === module.id);
      return progress?.completed === true;
    });

    if (!allCompleted) {
      return NextResponse.json(
        { error: 'Trilha não concluída' },
        { status: 400 }
      );
    }

    // Verificar se já existe certificado
    const { data: existingCertificate } = await supabase
      .from('certificates')
      .select('id, issued_at')
      .eq('user_id', user.id)
      .eq('trail_id', trailId)
      .single();

    let issuedAt: Date;
    if (existingCertificate) {
      // Se já existe, usar a data de emissão existente
      issuedAt = new Date(existingCertificate.issued_at);
    } else {
      // Criar novo certificado
      issuedAt = new Date();
      const { error: insertError } = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          trail_id: trailId,
          issued_at: issuedAt.toISOString(),
        });

      if (insertError) {
        console.error('Erro ao criar certificado:', insertError);
        return NextResponse.json(
          { error: 'Erro ao criar certificado' },
          { status: 500 }
        );
      }
    }

    // Gerar PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cores
    const goldColor = '#D4A053'; // Laranja/dourado da Partners
    const darkGoldColor = '#C44A0A';
    const textColor = '#1A1A1A';

    // Desenhar borda decorativa (linhas douradas/laranjas)
    doc.setDrawColor(goldColor);
    doc.setLineWidth(3);
    // Borda externa
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    // Borda interna
    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Logo "Partners" no topo (centralizado)
    doc.setFontSize(32);
    doc.setTextColor(goldColor);
    doc.setFont('helvetica', 'bold');
    const logoText = 'Partners';
    const logoWidth = doc.getTextWidth(logoText);
    doc.text(logoText, (pageWidth - logoWidth) / 2, 40);

    // Texto centralizado
    doc.setTextColor(textColor);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const titleText = 'CERTIFICADO DE CONCLUSÃO';
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, (pageWidth - titleWidth) / 2, 70);

    // Espaçamento
    let yPos = 90;

    // "Certificamos que"
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const certifyText = 'Certificamos que';
    const certifyWidth = doc.getTextWidth(certifyText);
    doc.text(certifyText, (pageWidth - certifyWidth) / 2, yPos);

    yPos += 20;

    // Nome do colaborador (destaque)
    const userName = userData.name || userData.email.split('@')[0];
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(goldColor);
    const nameWidth = doc.getTextWidth(userName);
    doc.text(userName, (pageWidth - nameWidth) / 2, yPos);

    yPos += 20;

    // "concluiu com sucesso a trilha"
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    const completedText = 'concluiu com sucesso a trilha';
    const completedWidth = doc.getTextWidth(completedText);
    doc.text(completedText, (pageWidth - completedWidth) / 2, yPos);

    yPos += 20;

    // Nome da trilha (destaque)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(goldColor);
    const trailNameWidth = doc.getTextWidth(trail.name);
    doc.text(trail.name, (pageWidth - trailNameWidth) / 2, yPos);

    yPos += 20;

    // Carga horária
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    const hoursText = trail.duration
      ? `com carga horária de ${trail.duration} horas`
      : 'com sucesso';
    const hoursWidth = doc.getTextWidth(hoursText);
    doc.text(hoursText, (pageWidth - hoursWidth) / 2, yPos);

    yPos += 25;

    // Data de conclusão formatada em pt-BR
    const formattedDate = issuedAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const dateText = `Data de conclusão: ${formattedDate}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, yPos);

    // Rodapé
    yPos = pageHeight - 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    const footerText = 'Partners — Plataforma de Onboarding';
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, yPos);

    // Converter PDF para buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-${trail.name.replace(/\s+/g, '-')}-${userData.name || 'usuario'}.pdf"`,
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
