import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, getSignedVideoUrl } from '@/lib/r2';
import type { UserRole } from '@/lib/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

    // Parse do FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const trailId = formData.get('trailId') as string | null;

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
        { error: 'Arquivo muito grande. Limite: 50MB' },
        { status: 400 }
      );
    }

    // Se for gestor, verificar se a trilha pertence à área dele
    if (userRole === 'gestor') {
      const { data: trail, error: trailError } = await supabase
        .from('trails')
        .select('area_id')
        .eq('id', trailId)
        .single();

      if (trailError || !trail) {
        return NextResponse.json(
          { error: 'Trilha não encontrada' },
          { status: 404 }
        );
      }

      if (trail.area_id !== userAreaId) {
        return NextResponse.json(
          { error: 'Acesso negado. A trilha não pertence à sua área' },
          { status: 403 }
        );
      }
    }

    // Gerar nome do arquivo com timestamp
    const timestamp = Date.now();
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitizar nome

    // Converter arquivo para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let url: string;
    let key: string;

    if (type === 'video') {
      // Upload para R2 com key: videos/{trailId}/{timestamp}-{filename}
      const fileKey = `videos/${trailId}/${timestamp}-${filename}`;
      await uploadToR2(buffer, fileKey, file.type);
      // Gerar presigned URL
      url = await getSignedVideoUrl(fileKey);
      key = fileKey;
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
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
