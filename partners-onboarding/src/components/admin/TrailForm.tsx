'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Trail, TrailType, Area } from '@/lib/types';

// Schema de validação
const trailFormSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    type: z.enum(['obrigatoria_global', 'obrigatoria_area', 'optativa']),
    area_id: z.string().uuid().nullable(),
    duration: z.number().min(0, 'Duração deve ser maior ou igual a 0').optional(),
  })
  .refine(
    (data) => {
      // Se tipo é obrigatoria_area, area_id deve ser obrigatório
      if (data.type === 'obrigatoria_area') {
        return data.area_id !== null;
      }
      // Se tipo é obrigatoria_global ou optativa, area_id deve ser null
      return data.area_id === null;
    },
    {
      message: 'Área é obrigatória para trilhas obrigatórias da área',
      path: ['area_id'],
    }
  );

type TrailFormData = z.infer<typeof trailFormSchema>;

interface TrailFormProps {
  initialData?: Trail;
  userRole: 'gestor' | 'admin';
  userAreaId: string | null;
  areas: Area[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TrailForm({
  initialData,
  userRole,
  userAreaId,
  areas,
  onSuccess,
  onCancel,
}: TrailFormProps) {
  const supabase = createClient();
  const isEditMode = !!initialData;
  const isGestor = userRole === 'gestor';

  // Se gestor, tipo fixo em obrigatoria_area e área fixa
  const defaultType = isGestor ? 'obrigatoria_area' : undefined;
  const defaultAreaId = isGestor ? userAreaId : null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TrailFormData>({
    resolver: zodResolver(trailFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      type: (initialData?.type as TrailType) || defaultType || 'obrigatoria_global',
      area_id: initialData?.area_id || defaultAreaId,
      duration: initialData?.duration || 0,
    },
  });

  const selectedType = watch('type');

  // Se gestor, travar tipo e área
  useEffect(() => {
    if (isGestor) {
      setValue('type', 'obrigatoria_area');
      if (userAreaId) {
        setValue('area_id', userAreaId);
      }
    }
  }, [isGestor, userAreaId, setValue]);

  // Limpar area_id quando tipo não for obrigatoria_area
  useEffect(() => {
    if (selectedType !== 'obrigatoria_area') {
      setValue('area_id', null);
    }
  }, [selectedType, setValue]);

  const onSubmit = async (data: TrailFormData) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        toast.error('Erro', { description: 'Usuário não autenticado' });
        return;
      }

      const payload = {
        name: data.name,
        description: data.description || null,
        type: data.type,
        area_id: data.area_id,
        duration: data.duration || 0,
        created_by: sessionData.session.user.id,
      };

      if (isEditMode && initialData) {
        // Update
        const { error } = await supabase
          .from('trails')
          .update(payload)
          .eq('id', initialData.id);

        if (error) throw error;

        toast.success('Trilha atualizada com sucesso!');
      } else {
        // Insert
        const { data: newTrail, error } = await supabase
          .from('trails')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        toast.success('Trilha criada com sucesso!');

        // Criar notificações para usuários relevantes
        if (newTrail) {
          try {
            // Buscar usuários que devem ser notificados
            let targetUserIds: string[] = [];

            if (data.type === 'obrigatoria_global') {
              // Notificar todos os colaboradores
              const { data: allUsers } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'colaborador');

              if (allUsers) {
                targetUserIds = allUsers.map((u) => u.id);
              }
            } else if (data.type === 'obrigatoria_area' && data.area_id) {
              // Notificar colaboradores da área
              const { data: areaUsers } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'colaborador')
                .eq('area_id', data.area_id);

              if (areaUsers) {
                targetUserIds = areaUsers.map((u) => u.id);
              }
            } else if (data.type === 'optativa') {
              // Notificar todos os colaboradores
              const { data: allUsers } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'colaborador');

              if (allUsers) {
                targetUserIds = allUsers.map((u) => u.id);
              }
            }

            // Criar notificações via API
            if (targetUserIds.length > 0) {
              await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userIds: targetUserIds,
                  type: 'nova_trilha',
                  message: `Nova trilha disponível: ${data.name}`,
                }),
              });
            }
          } catch (notifError) {
            // Não falhar a criação da trilha se a notificação falhar
            console.error('Erro ao criar notificações:', notifError);
          }
        }
      }

      onSuccess();
    } catch (error: unknown) {
      console.error('Erro ao salvar trilha:', error);
      toast.error('Erro ao salvar trilha', {
        description:
          error instanceof Error ? error.message : 'Ocorreu um erro inesperado',
      });
    }
  };

  const typeOptions = [
    { value: 'obrigatoria_global', label: 'Obrigatória Global' },
    { value: 'obrigatoria_area', label: 'Obrigatória da Área' },
    { value: 'optativa', label: 'Optativa' },
  ];

  const areaOptions = areas.map((area) => ({
    value: area.id,
    label: area.name,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nome"
        {...register('name')}
        error={errors.name?.message}
        placeholder="Nome da trilha"
        disabled={isSubmitting}
      />

      <Textarea
        label="Descrição"
        {...register('description')}
        error={errors.description?.message}
        placeholder="Descrição da trilha (opcional)"
        disabled={isSubmitting}
        rows={4}
      />

      <Select
        label="Tipo"
        {...register('type', {
          onChange: (e) => setValue('type', e.target.value as TrailType),
        })}
        value={watch('type')}
        options={typeOptions}
        error={errors.type?.message}
        disabled={isSubmitting || isGestor}
        placeholder="Selecione o tipo"
      />

      {selectedType === 'obrigatoria_area' && (
        <Select
          label="Área"
          {...register('area_id', {
            setValueAs: (value: string) => (value === '' ? null : value),
            onChange: (e) => setValue('area_id', e.target.value === '' ? null : e.target.value),
          })}
          value={watch('area_id') || ''}
          options={areaOptions}
          error={errors.area_id?.message}
          disabled={isSubmitting || isGestor}
          placeholder="Selecione a área"
        />
      )}

      <Input
        label="Duração estimada (minutos)"
        type="number"
        {...register('duration', { valueAsNumber: true })}
        error={errors.duration?.message}
        placeholder="0"
        min={0}
        disabled={isSubmitting}
      />

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEditMode ? 'Atualizar' : 'Criar'} Trilha
        </Button>
      </div>
    </form>
  );
}
