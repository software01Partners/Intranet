'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Area } from '@/lib/types';

// Schema de validação
const areaFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  abbreviation: z
    .string()
    .min(1, 'Abreviação é obrigatória')
    .max(5, 'Abreviação deve ter no máximo 5 caracteres')
    .toUpperCase(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor deve ser um código hexadecimal válido'),
});

type AreaFormData = z.infer<typeof areaFormSchema>;

interface AreaFormProps {
  initialData?: Area;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AreaForm({ initialData, onSuccess, onCancel }: AreaFormProps) {
  const supabase = createClient();
  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      abbreviation: initialData?.abbreviation || '',
      color: initialData?.color || '#3B82F6',
    },
  });

  const onSubmit = async (data: AreaFormData) => {
    try {
      if (isEditMode && initialData) {
        // Atualizar área existente
        const { error } = await supabase
          .from('areas')
          .update({
            name: data.name,
            abbreviation: data.abbreviation,
            color: data.color,
          })
          .eq('id', initialData.id);

        if (error) {
          throw error;
        }

        toast.success('Área atualizada com sucesso!');
      } else {
        // Criar nova área
        const { error } = await supabase.from('areas').insert({
          name: data.name,
          abbreviation: data.abbreviation,
          color: data.color,
        });

        if (error) {
          throw error;
        }

        toast.success('Área criada com sucesso!');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar área:', error);
      toast.error('Erro ao salvar área', {
        description: error.message || 'Ocorreu um erro inesperado',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nome da Área"
        placeholder="Ex: Comercial"
        {...register('name')}
        error={errors.name?.message}
        disabled={isSubmitting}
      />

      <Input
        label="Abreviação"
        placeholder="Ex: COM"
        maxLength={5}
        {...register('abbreviation')}
        error={errors.abbreviation?.message}
        disabled={isSubmitting}
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED]">
          Cor
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            {...register('color')}
            className="w-16 h-10 rounded-xl border border-[#E2E5F1] dark:border-[#2D2D4A] cursor-pointer bg-[#F8F9FC] dark:bg-[#0F0F1A]"
            disabled={isSubmitting}
          />
          <Input
            placeholder="#3B82F6"
            {...register('color')}
            error={errors.color?.message}
            disabled={isSubmitting}
            className="flex-1"
          />
        </div>
        {errors.color && (
          <p className="mt-1.5 text-sm text-red-500">{errors.color.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEditMode ? 'Salvar Alterações' : 'Criar Área'}
        </Button>
      </div>
    </form>
  );
}
