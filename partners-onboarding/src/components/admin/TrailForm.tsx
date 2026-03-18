'use client';

import { useEffect, useState } from 'react';
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
    type: z.enum(['obrigatoria_global', 'obrigatoria_area', 'optativa_global', 'optativa_area']),
    area_id: z.string().uuid().nullable(),
    duration: z.number().min(0, 'Duração deve ser maior ou igual a 0').optional(),
    deadline: z.string().nullable(),
  })
  .refine(
    (data) => {
      // Se tipo é _area, area_id deve ser obrigatório
      if (data.type === 'obrigatoria_area' || data.type === 'optativa_area') {
        return data.area_id !== null;
      }
      // Se tipo é _global, area_id deve ser null
      return data.area_id === null;
    },
    {
      message: 'Área é obrigatória para trilhas da área',
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

  // Controle de "sem prazo"
  const [hasDeadline, setHasDeadline] = useState(!!initialData?.deadline);

  // Se gestor, tipo fixo em obrigatoria_area e área fixa
  const defaultType = isGestor ? 'obrigatoria_area' : undefined;
  const defaultAreaId = isGestor ? userAreaId : null;

  // Converter deadline para formato date input (YYYY-MM-DD)
  const deadlineToDateInput = (deadline: string | null | undefined): string => {
    if (!deadline) return '';
    // Se já está no formato YYYY-MM-DD, usar direto
    if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline;
    // Se vier como ISO com timezone, extrair só a parte da data
    return deadline.split('T')[0];
  };

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
      deadline: deadlineToDateInput(initialData?.deadline),
    },
  });

  const selectedType = watch('type');

  // Se gestor, travar área (tipo pode ser obrigatoria_area ou optativa_area)
  useEffect(() => {
    if (isGestor) {
      if (selectedType !== 'obrigatoria_area' && selectedType !== 'optativa_area') {
        setValue('type', 'obrigatoria_area');
      }
      if (userAreaId) {
        setValue('area_id', userAreaId);
      }
    }
  }, [isGestor, userAreaId, selectedType, setValue]);

  // Limpar area_id quando tipo não for _area
  useEffect(() => {
    if (selectedType !== 'obrigatoria_area' && selectedType !== 'optativa_area') {
      setValue('area_id', null);
    }
  }, [selectedType, setValue]);

  const onSubmit = async (data: TrailFormData) => {
    try {
      // Salvar deadline como data pura (YYYY-MM-DD) sem conversão de fuso
      let deadlineValue: string | null = null;
      if (hasDeadline && data.deadline) {
        deadlineValue = data.deadline;
      }

      const payload = {
        ...(isEditMode && initialData ? { id: initialData.id } : {}),
        name: data.name,
        description: data.description || null,
        type: data.type,
        area_id: data.area_id,
        duration: data.duration || 0,
        deadline: deadlineValue,
      };

      const response = await fetch('/api/admin/trails', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar trilha');
      }

      toast.success(isEditMode ? 'Trilha atualizada com sucesso!' : 'Trilha criada com sucesso!');

      // Criar notificações para usuários relevantes (apenas ao criar)
      if (!isEditMode && result.id) {
        try {
          let targetUserIds: string[] = [];

          if (data.type === 'obrigatoria_global' || data.type === 'optativa_global') {
            const { data: allUsers } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'colaborador');
            if (allUsers) targetUserIds = allUsers.map((u) => u.id);
          } else if ((data.type === 'obrigatoria_area' || data.type === 'optativa_area') && data.area_id) {
            const { data: areaUsers } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'colaborador')
              .eq('area_id', data.area_id);
            if (areaUsers) targetUserIds = areaUsers.map((u) => u.id);
          }

          if (targetUserIds.length > 0) {
            await fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userIds: targetUserIds,
                type: 'nova_trilha',
                message: `Nova trilha disponível: ${data.name}`,
              }),
            });
          }
        } catch (notifError) {
          console.error('Erro ao criar notificações:', notifError);
        }
      }

      onSuccess();
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message ?? JSON.stringify(error);
      console.error('Erro ao salvar trilha:', msg);
      toast.error('Erro ao salvar trilha', { description: msg });
    }
  };

  const typeOptions = isGestor
    ? [
        { value: 'obrigatoria_area', label: 'Obrigatória da Área' },
        { value: 'optativa_area', label: 'Optativa da Área' },
      ]
    : [
        { value: 'obrigatoria_global', label: 'Obrigatória Global' },
        { value: 'obrigatoria_area', label: 'Obrigatória da Área' },
        { value: 'optativa_global', label: 'Optativa Global' },
        { value: 'optativa_area', label: 'Optativa da Área' },
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
        disabled={isSubmitting}
        placeholder="Selecione o tipo"
      />

      {(selectedType === 'obrigatoria_area' || selectedType === 'optativa_area') && (
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

      {/* Prazo */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED] cursor-pointer">
          <input
            type="checkbox"
            checked={hasDeadline}
            onChange={(e) => {
              setHasDeadline(e.target.checked);
              if (!e.target.checked) {
                setValue('deadline', null);
              }
            }}
            className="rounded border-[#D1D5DB] dark:border-[#4A4A6A] text-[#6B2FA0] focus:ring-[#6B2FA0]"
            disabled={isSubmitting}
          />
          Definir prazo para conclusão
        </label>
        {hasDeadline && (
          <Input
            label="Prazo"
            type="date"
            {...register('deadline')}
            error={errors.deadline?.message}
            min={new Date().toISOString().split('T')[0]}
            disabled={isSubmitting}
          />
        )}
      </div>

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
