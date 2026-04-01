'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Upload, FileVideo, FileText, HelpCircle, Link2, Youtube } from 'lucide-react';
import type { Module, ModuleType, Trail } from '@/lib/types';
import { isYoutubeUrl, isGoogleDriveUrl } from '@/lib/utils';
import { logAction } from '@/lib/audit-client';

// Schema de validação dinâmico baseado no modo de edição
const createModuleFormSchema = (hasExistingContent: boolean) =>
  z
    .object({
      title: z.string().min(1, 'Título é obrigatório'),
      type: z.enum(['video', 'document', 'quiz']),
      duration: z.number().min(0, 'Duração deve ser maior ou igual a 0').optional(),
      file: z.instanceof(File).optional(),
      contentSource: z.enum(['upload', 'link']).optional(),
      externalUrl: z.string().optional(),
    })
    .refine(
      (data) => {
        // Se tipo é video com link externo, URL é obrigatória
        if (data.type === 'video' && data.contentSource === 'link') {
          return !!data.externalUrl && data.externalUrl.trim().length > 0;
        }
        // Se tipo é video ou document com upload, arquivo é obrigatório (se não tiver content_url existente)
        if (data.type === 'video' && data.contentSource !== 'link' && !data.file && !hasExistingContent) {
          return false;
        }
        if (data.type === 'document' && !data.file && !hasExistingContent) {
          return false;
        }
        return true;
      },
      {
        message: 'Arquivo ou link é obrigatório',
        path: ['file'],
      }
    )
    .refine(
      (data) => {
        // Validar que a URL é do YouTube ou Google Drive
        if (data.type === 'video' && data.contentSource === 'link' && data.externalUrl) {
          const url = data.externalUrl.trim();
          return isYoutubeUrl(url) || isGoogleDriveUrl(url);
        }
        return true;
      },
      {
        message: 'Insira um link válido do YouTube ou Google Drive',
        path: ['externalUrl'],
      }
    );

type ModuleFormData = z.infer<ReturnType<typeof createModuleFormSchema>>;

interface ModuleFormProps {
  initialData?: Module;
  trailId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ModuleForm({
  initialData,
  trailId,
  onSuccess,
  onCancel,
}: ModuleFormProps) {
  const isEditMode = !!initialData;
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Detectar se conteúdo existente é link externo
  const existingIsExternal = !!(
    initialData?.content_url &&
    (isYoutubeUrl(initialData.content_url) || isGoogleDriveUrl(initialData.content_url))
  );
  const [contentSource, setContentSource] = useState<'upload' | 'link'>(
    existingIsExternal ? 'link' : 'upload'
  );

  const hasExistingContent = !!(isEditMode && initialData?.content_url);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ModuleFormData>({
    resolver: zodResolver(createModuleFormSchema(hasExistingContent)),
    defaultValues: {
      title: initialData?.title || '',
      type: (initialData?.type as ModuleType) || 'video',
      duration: initialData?.duration || 0,
      contentSource: existingIsExternal ? 'link' : 'upload',
      externalUrl: existingIsExternal ? initialData?.content_url || '' : '',
    },
  });

  const selectedType = watch('type');


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (selectedType === 'video') {
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
        if (!validTypes.includes(file.type)) {
          toast.error('Formato inválido', {
            description: 'Apenas arquivos MP4, MOV são permitidos para vídeos',
          });
          return;
        }
      } else if (selectedType === 'document') {
        if (file.type !== 'application/pdf') {
          toast.error('Formato inválido', {
            description: 'Apenas arquivos PDF são permitidos',
          });
          return;
        }
      }

      // Validar tamanho (500MB)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande', {
          description: 'O tamanho máximo é 500MB',
        });
        return;
      }

      setSelectedFile(file);
      setValue('file', file, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: ModuleFormData) => {
    try {
      let contentUrl = initialData?.content_url || null;

      // Se vídeo com link externo, salvar URL diretamente (sem upload)
      if (data.type === 'video' && data.contentSource === 'link' && data.externalUrl) {
        contentUrl = data.externalUrl.trim();
      }

      // Upload de arquivo se necessário (POST com FormData: file, type, trailId)
      if ((data.type === 'video' || data.type === 'document') && data.contentSource !== 'link' && data.file) {
        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('type', data.type);
        formData.append('trailId', trailId);

        // Simular progresso (upload real não tem progresso nativo)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        // Enviar FormData sem definir Content-Type (o browser define multipart/form-data; boundary=... automaticamente)
        let response: Response;
        try {
          response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            // Não passar headers: { 'Content-Type': '...' } — quebra o boundary e causa "Failed to parse body as FormData"
          });
        } finally {
          clearInterval(progressInterval);
        }

        setUploadProgress(100);

        if (!response.ok) {
          let errorMessage = 'Erro ao fazer upload';
          try {
            const errorData = await response.json();
            if (errorData?.error) errorMessage = errorData.error;
          } catch {
            // resposta não é JSON
          }
          setIsUploading(false);
          setUploadProgress(0);
          toast.error('Erro no upload', { description: errorMessage });
          return;
        }

        const uploadData = await response.json();
        // Salvar o path/key no banco (não a signed URL), para que a página gere signed URLs na hora
        contentUrl = uploadData?.key ?? uploadData?.url ?? contentUrl;
      }

      const payload = {
        trail_id: trailId,
        title: data.title,
        type: data.type,
        content_url: contentUrl,
        duration: data.duration || 0,
        sort_order: initialData?.sort_order || 0,
      };

      if (isEditMode && initialData) {
        // Update via API
        const response = await fetch('/api/admin/modules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: initialData.id, ...payload }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao atualizar módulo');

        toast.success('Módulo atualizado com sucesso!');
      } else {
        // Create via API (sort_order calculado no server)
        const response = await fetch('/api/admin/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao criar módulo');

        toast.success('Módulo criado com sucesso!');
      }

      setIsUploading(false);
      setUploadProgress(0);
      onSuccess();
    } catch (error: unknown) {
      console.error('Erro ao salvar módulo:', error);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error('Erro ao salvar módulo', {
        description:
          error instanceof Error ? error.message : 'Ocorreu um erro inesperado',
      });
    }
  };

  const typeOptions = [
    { value: 'video', label: 'Vídeo' },
    { value: 'document', label: 'Documento' },
    { value: 'quiz', label: 'Quiz' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Título"
        {...register('title')}
        error={errors.title?.message}
        placeholder="Título do módulo"
        disabled={isSubmitting || isUploading}
      />

      <Select
        label="Tipo"
        {...register('type', {
          onChange: (e) => {
            setValue('type', e.target.value as ModuleType);
            setSelectedFile(null);
            setValue('file', undefined as any);
          },
        })}
        value={watch('type')}
        options={typeOptions}
        error={errors.type?.message}
        disabled={isSubmitting || isUploading}
        placeholder="Selecione o tipo"
      />

      <Input
        label="Duração estimada (minutos)"
        type="number"
        {...register('duration', { valueAsNumber: true })}
        error={errors.duration?.message}
        placeholder="0"
        min={0}
        disabled={isSubmitting || isUploading}
      />

      {/* Toggle Upload / Link externo (só para vídeo) */}
      {selectedType === 'video' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
            Origem do conteúdo
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setContentSource('upload');
                setValue('contentSource', 'upload');
                setValue('externalUrl', '');
              }}
              disabled={isSubmitting || isUploading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentSource === 'upload'
                  ? 'bg-[#1B4D3E] text-white'
                  : 'bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#7A7468] dark:text-[#9A9590] border border-[#E0DCD6] dark:border-[#3D3D3D] hover:border-[#1B4D3E] dark:hover:border-[#34D399]'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload de arquivo
            </button>
            <button
              type="button"
              onClick={() => {
                setContentSource('link');
                setValue('contentSource', 'link');
                setSelectedFile(null);
                setValue('file', undefined as any);
              }}
              disabled={isSubmitting || isUploading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentSource === 'link'
                  ? 'bg-[#1B4D3E] text-white'
                  : 'bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#7A7468] dark:text-[#9A9590] border border-[#E0DCD6] dark:border-[#3D3D3D] hover:border-[#1B4D3E] dark:hover:border-[#34D399]'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Link externo
            </button>
          </div>
        </div>
      )}

      {/* Input de link externo (YouTube / Google Drive) */}
      {selectedType === 'video' && contentSource === 'link' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
            Link do vídeo (YouTube ou Google Drive)
            {!isEditMode && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Youtube className="w-5 h-5 text-[#B0A99E] dark:text-[#9A9590]" />
            </div>
            <input
              type="url"
              {...register('externalUrl')}
              placeholder="https://www.youtube.com/watch?v=... ou https://drive.google.com/file/d/..."
              disabled={isSubmitting || isUploading}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] text-sm text-[#2D2A26] dark:text-[#E8E5E0] placeholder-[#B0A99E] dark:placeholder-[#9A9590] focus:outline-none focus:border-[#1B4D3E] dark:focus:border-[#34D399] transition-colors"
            />
          </div>
          {errors.externalUrl && (
            <p className="text-sm text-red-500">{errors.externalUrl.message}</p>
          )}
          <p className="text-xs text-[#7A7468] dark:text-[#9A9590]">
            Cole o link do YouTube ou do Google Drive. Para Google Drive, certifique-se de que o compartilhamento está habilitado.
          </p>
        </div>
      )}

      {/* Upload de arquivo (vídeo com upload ou documento) */}
      {((selectedType === 'video' && contentSource === 'upload') || selectedType === 'document') && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
            Arquivo {selectedType === 'video' ? '(MP4, MOV - máx. 500MB)' : '(PDF - máx. 500MB)'}
            {!isEditMode && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <input
              type="file"
              accept={selectedType === 'video' ? 'video/mp4,video/quicktime,video/x-msvideo' : 'application/pdf'}
              onChange={handleFileChange}
              disabled={isSubmitting || isUploading}
              className="hidden"
              id="module-file-input"
            />
            <label
              htmlFor="module-file-input"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] cursor-pointer hover:border-[#1B4D3E] dark:hover:border-[#34D399] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedType === 'video' ? (
                <FileVideo className="w-5 h-5 text-[#B0A99E] dark:text-[#9A9590]" />
              ) : (
                <FileText className="w-5 h-5 text-[#B0A99E] dark:text-[#9A9590]" />
              )}
              <span className="text-sm text-[#2D2A26] dark:text-[#E8E5E0] flex-1">
                {selectedFile
                  ? selectedFile.name
                  : initialData?.content_url && !existingIsExternal
                  ? 'Arquivo já carregado (clique para substituir)'
                  : 'Selecione um arquivo'}
              </span>
              <Upload className="w-4 h-4 text-[#B0A99E] dark:text-[#9A9590]" />
            </label>
          </div>
          {errors.file && (
            <p className="text-sm text-red-500">{errors.file.message}</p>
          )}
          {isUploading && (
            <div className="space-y-1">
              <div className="w-full bg-[#E0DCD6] dark:bg-[#3D3D3D] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#1B4D3E] to-[#34D399] h-2 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-[#7A7468] dark:text-[#9A9590] text-center">
                {uploadProgress}% - Enviando arquivo...
              </p>
            </div>
          )}
        </div>
      )}

      {selectedType === 'quiz' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-600/10 border border-blue-600/20">
          <HelpCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-400">
            Após salvar, cadastre as questões do quiz.
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting || isUploading}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting || isUploading}>
          {isEditMode ? 'Atualizar' : 'Criar'} Módulo
        </Button>
      </div>
    </form>
  );
}
