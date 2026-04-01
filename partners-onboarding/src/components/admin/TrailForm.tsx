'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Button } from '@/components/ui/Button';
import type { Trail, TrailType, Area } from '@/lib/types';

// Schema de validação
const trailFormSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    type: z.enum(['obrigatoria_global', 'obrigatoria_area', 'optativa_global', 'optativa_area']),
    area_ids: z.array(z.string().uuid()).optional(),
    duration: z.number().min(0, 'Duração deve ser maior ou igual a 0').optional(),
    deadline: z.string().nullable(),
  })
;

type TrailFormData = z.infer<typeof trailFormSchema>;

interface UserOption {
  id: string;
  name: string;
  area_id: string | null;
}

interface TrailFormProps {
  initialData?: Trail;
  userRole: 'gestor' | 'admin';
  userAreaId?: string | null;
  userAreaIds?: string[];
  areas: Area[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TrailForm({
  initialData,
  userRole,
  userAreaId,
  userAreaIds,
  areas,
  onSuccess,
  onCancel,
}: TrailFormProps) {
  // userAreaIds takes priority over legacy userAreaId
  const resolvedAreaIds = userAreaIds ?? (userAreaId ? [userAreaId] : []);

  const isEditMode = !!initialData;
  const isGestor = userRole === 'gestor';

  // Controle de "sem prazo"
  const [hasDeadline, setHasDeadline] = useState(!!initialData?.deadline);

  // Multi-select de áreas
  const initialAreaIds = initialData?.area_ids && initialData.area_ids.length > 0
    ? initialData.area_ids
    : isGestor && resolvedAreaIds.length > 0
      ? resolvedAreaIds
      : [];
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(initialAreaIds);

  // Individual user assignment
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialData?.user_ids ?? []);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch available users on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      setLoadingUsers(true);
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) return;
        const data = await res.json();
        const allUsers = (data.users || []) as Array<{ id: string; name: string; role: string; area_id: string | null }>;
        // Mostrar todos os usuários (colaboradores, gestores, admins)
        let filteredUsers = allUsers;
        // Se gestor, filtrar apenas usuários das áreas que ele gerencia
        if (isGestor && resolvedAreaIds.length > 0) {
          filteredUsers = allUsers.filter((u) => u.area_id && resolvedAreaIds.includes(u.area_id));
        }
        if (!cancelled) {
          setAvailableUsers(filteredUsers.map((u) => ({ id: u.id, name: u.name, area_id: u.area_id })));
        }
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, [isGestor, resolvedAreaIds]);

  // Se gestor, tipo fixo em obrigatoria_area e área fixa
  const defaultType = isGestor ? 'obrigatoria_area' : undefined;

  // Converter deadline para formato date input (YYYY-MM-DD)
  const deadlineToDateInput = (deadline: string | null | undefined): string => {
    if (!deadline) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline;
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
      area_ids: initialAreaIds,
      duration: initialData?.duration || 0,
      deadline: deadlineToDateInput(initialData?.deadline),
    },
  });

  const selectedType = watch('type');

  // Se gestor, travar área
  useEffect(() => {
    if (isGestor) {
      if (selectedType !== 'obrigatoria_area' && selectedType !== 'optativa_area') {
        setValue('type', 'obrigatoria_area');
      }
      if (resolvedAreaIds.length > 0) {
        setValue('area_ids', resolvedAreaIds);
        setSelectedAreaIds(resolvedAreaIds);
      }
    }
  }, [isGestor, resolvedAreaIds, selectedType, setValue]);

  // Limpar area_ids quando tipo não for _area
  useEffect(() => {
    if (selectedType !== 'obrigatoria_area' && selectedType !== 'optativa_area') {
      setValue('area_ids', []);
      setSelectedAreaIds([]);
    }
  }, [selectedType, setValue]);

  const onSubmit = async (data: TrailFormData) => {
    try {
      const isAreaType = data.type === 'obrigatoria_area' || data.type === 'optativa_area';

      // Validar: para tipos _area, precisa de pelo menos uma área OU um colaborador individual
      if (isAreaType && selectedAreaIds.length === 0 && selectedUserIds.length === 0) {
        toast.error('Selecione pelo menos uma área ou um colaborador individual');
        return;
      }

      let deadlineValue: string | null = null;
      if (hasDeadline && data.deadline) {
        deadlineValue = data.deadline;
      }

      const payload = {
        ...(isEditMode && initialData ? { id: initialData.id } : {}),
        name: data.name,
        description: data.description || null,
        type: data.type,
        area_ids: isAreaType ? selectedAreaIds : [],
        user_ids: selectedUserIds,
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

      // Criar notificações para usuários relevantes (fire-and-forget — não bloqueia o form)
      if (!isEditMode && result.id) {
        (async () => {
          try {
            // Buscar usuários relevantes via API
            const usersRes = await fetch('/api/admin/users');
            if (!usersRes.ok) return;
            const usersApiData = await usersRes.json();
            const allUsers = (usersApiData.users || []) as Array<{ id: string; role: string; area_id: string | null }>;

            let targetUserIds: string[] = [];
            if (data.type === 'obrigatoria_global' || data.type === 'optativa_global') {
              targetUserIds = allUsers.filter((u) => u.role === 'colaborador').map((u) => u.id);
            } else if (isAreaType && selectedAreaIds.length > 0) {
              targetUserIds = allUsers
                .filter((u) => u.role === 'colaborador' && u.area_id && selectedAreaIds.includes(u.area_id))
                .map((u) => u.id);
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
        })();
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

  const showAreaSelector = selectedType === 'obrigatoria_area' || selectedType === 'optativa_area';

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

      {showAreaSelector && (
        <MultiSelect
          label={isEditMode ? 'Áreas' : 'Áreas'}
          options={areaOptions}
          value={selectedAreaIds}
          onChange={(newIds) => {
            setSelectedAreaIds(newIds);
            setValue('area_ids', newIds);
          }}
          error={errors.area_ids?.message}
          disabled={isSubmitting || isGestor}
          placeholder="Selecione uma ou mais áreas"
        />
      )}

      {/* Atribuição individual de colaboradores */}
      <MultiSelect
        label="Colaboradores individuais (opcional)"
        options={availableUsers.map((u) => {
          const area = areas.find((a) => a.id === u.area_id);
          const areaLabel = area ? area.name : 'Sem área';
          return { value: u.id, label: `${u.name} (${areaLabel})` };
        })}
        value={selectedUserIds}
        onChange={setSelectedUserIds}
        disabled={isSubmitting || loadingUsers}
        placeholder={loadingUsers ? 'Carregando usuários...' : 'Buscar e selecionar colaboradores'}
      />

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
        <label className="flex items-center gap-2 text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] cursor-pointer">
          <input
            type="checkbox"
            checked={hasDeadline}
            onChange={(e) => {
              setHasDeadline(e.target.checked);
              if (!e.target.checked) {
                setValue('deadline', null);
              }
            }}
            className="rounded border-[#D1D5DB] dark:border-[#4D4D4D] text-[#1B4D3E] focus:ring-[#1B4D3E]"
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
