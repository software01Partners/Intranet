import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, getSignedVideoUrl } from '@/lib/r2';
import type { UserRole } from '@/lib/types';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB (alinhado ao proxyClientMaxBodySize no next.config)

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar dados do usuário na tabela users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, area_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Erro ao buscar dados do usuário' },
        { status: 500 }
      );
    }

    const userRole = userData.role as UserRole;
    const userAreaId = userData.area_id;

    // Verificar se o usuário é admin ou gestor
    if (userRole !== 'admin' && userRole !== 'gestor') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas admin e gestor podem fazer upload' },
        { status: 403 }
      );
    }

    // Parse do FormData (não usar bodyParser nem config de body; o browser envia multipart com boundary automático)
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('Erro ao fazer parse do FormData:', parseError);
      const msg =
        parseError instanceof Error
          ? parseError.message
          : 'Failed to parse body as FormData. Envie com FormData e sem definir Content-Type no fetch.';
      return NextResponse.json(
        { error: msg },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const trailId = formData.get('trailId') as string | null;

    console.log('Upload recebido:', type, file?.name, file?.size);

    // Validações
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'video' && type !== 'document')) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "video" ou "document"' },
        { status: 400 }
      );
    }

    if (!trailId) {
      return NextResponse.json(
        { error: 'trailId não fornecido' },
        { status: 400 }
      );
    }

    // Verificar tamanho do arquivo
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Limite: 500MB' },
        { status: 400 }
      );
    }

    // Se for gestor, verificar se a trilha pertence à área dele (via trail_areas)
    if (userRole === 'gestor') {
      const { data: trailAreas } = await supabase
        .from('trail_areas')
        .select('area_id')
        .eq('trail_id', trailId);

      const trailAreaIds = (trailAreas || []).map((ta) => ta.area_id);

      if (trailAreaIds.length === 0) {
        return NextResponse.json(
          { error: 'Trilha não encontrada' },
          { status: 404 }
        );
      }

      if (!userAreaId || !trailAreaIds.includes(userAreaId)) {
        return NextResponse.json(
          { error: 'Acesso negado. A trilha não pertence à sua área' },
          { status: 403 }
        );
      }
    }

    // Gerar nome do arquivo com timestamp
    const timestamp = Date.now();
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitizar nome

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let url: string;
    let key: string;

    if (type === 'video') {
      // Garantir que variáveis R2 existem (bucket "partners-videos", endpoint R2)
      if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        return NextResponse.json(
          { error: 'Configuração R2 incompleta (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)' },
          { status: 500 }
        );
      }
      try {
        // Upload para R2 (S3Client R2, bucket partners-videos, endpoint https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com)
        const fileKey = `videos/${trailId}/${timestamp}-${filename}`;
        await uploadToR2(buffer, fileKey, file.type);
        url = await getSignedVideoUrl(fileKey);
        key = fileKey;
      } catch (r2Error) {
        console.error('Erro R2 upload/signedUrl:', r2Error);
        const message = r2Error instanceof Error ? r2Error.message : 'Erro ao enviar vídeo para R2';
        return NextResponse.json(
          { error: `R2: ${message}` },
          { status: 500 }
        );
      }
    } else {
      // Upload para Supabase Storage com path: {trailId}/{timestamp}-{filename}
      const filePath = `${trailId}/${timestamp}-${filename}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `Erro ao fazer upload: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Gerar signed URL do Supabase
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600); // 1 hora

      if (urlError || !urlData) {
        return NextResponse.json(
          { error: 'Erro ao gerar URL assinada' },
          { status: 500 }
        );
      }

      url = urlData.signedUrl;
      key = filePath;
    }

    return NextResponse.json({
      url,
      key,
      type,
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
