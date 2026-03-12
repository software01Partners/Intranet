'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Upload, FileVideo, FileText, HelpCircle } from 'lucide-react';
import type { Module, ModuleType, Trail } from '@/lib/types';

// Schema de validação dinâmico baseado no modo de edição
const createModuleFormSchema = (hasExistingContent: boolean) =>
  z
    .object({
      title: z.string().min(1, 'Título é obrigatório'),
      type: z.enum(['video', 'document', 'quiz']),
      duration: z.number().min(0, 'Duração deve ser maior ou igual a 0').optional(),
      file: z.instanceof(File).optional(),
    })
    .refine(
      (data) => {
        // Se tipo é video ou document, arquivo é obrigatório apenas se não tiver content_url existente
        if ((data.type === 'video' || data.type === 'document') && !data.file && !hasExistingContent) {
          return false;
        }
        return true;
      },
      {
        message: 'Arquivo é obrigatório para vídeo e documento',
        path: ['file'],
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
  const supabase = createClient();
  const isEditMode = !!initialData;
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

      // Validar tamanho (50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande', {
          description: 'O tamanho máximo é 50MB',
        });
        return;
      }

      setSelectedFile(file);
      setValue('file', file, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: ModuleFormData) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        toast.error('Erro', { description: 'Usuário não autenticado' });
        return;
      }

      let contentUrl = initialData?.content_url || null;

      // Upload de arquivo se necessário
      if ((data.type === 'video' || data.type === 'document') && data.file) {
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

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao fazer upload');
        }

        const uploadData = await response.json();
        contentUrl = uploadData.url;
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
        // Update
        const { error } = await supabase
          .from('modules')
          .update(payload)
          .eq('id', initialData.id);

        if (error) throw error;

        toast.success('Módulo atualizado com sucesso!');
      } else {
        // Insert - buscar próximo sort_order
        const { data: modulesData } = await supabase
          .from('modules')
          .select('sort_order')
          .eq('trail_id', trailId)
          .order('sort_order', { ascending: false })
          .limit(1);

        const nextSortOrder = modulesData && modulesData.length > 0
          ? (modulesData[0].sort_order || 0) + 1
          : 0;

        const { data: newModule, error } = await supabase
          .from('modules')
          .insert({ ...payload, sort_order: nextSortOrder })
          .select()
          .single();

        if (error) throw error;

        toast.success('Módulo criado com sucesso!');

        // Se for quiz, abrir editor de questões
        if (data.type === 'quiz' && newModule) {
          // O onSuccess será chamado e o ModulesManager abrirá o QuizEditor
          // Passamos o moduleId via callback ou state
        }
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

      {(selectedType === 'video' || selectedType === 'document') && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#E8E8ED]">
            Arquivo {selectedType === 'video' ? '(MP4, MOV - máx. 50MB)' : '(PDF - máx. 50MB)'}
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
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0A0A0F] border border-[#262630] cursor-pointer hover:border-[#E8580C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedType === 'video' ? (
                <FileVideo className="w-5 h-5 text-[#8888A0]" />
              ) : (
                <FileText className="w-5 h-5 text-[#8888A0]" />
              )}
              <span className="text-sm text-[#E8E8ED] flex-1">
                {selectedFile
                  ? selectedFile.name
                  : initialData?.content_url
                  ? 'Arquivo já carregado (clique para substituir)'
                  : 'Selecione um arquivo'}
              </span>
              <Upload className="w-4 h-4 text-[#8888A0]" />
            </label>
          </div>
          {errors.file && (
            <p className="text-sm text-red-500">{errors.file.message}</p>
          )}
          {isUploading && (
            <div className="space-y-1">
              <div className="w-full bg-[#0A0A0F] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#E8580C] h-2 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-[#8888A0] text-center">
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
