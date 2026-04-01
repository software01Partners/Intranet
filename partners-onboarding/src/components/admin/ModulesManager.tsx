'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/Card';
import { ModuleForm } from './ModuleForm';
import { QuizEditor } from './QuizEditor';
import type { Module, ModuleType, Trail, UserRole } from '@/lib/types';

interface ModulesManagerProps {
  areaFilter: string | null; // Se presente, filtra trilhas por área (modo gestor)
  userRole: UserRole;
}

export function ModulesManager({ areaFilter, userRole }: ModulesManagerProps) {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTrailId, setSelectedTrailId] = useState<string>('');
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isQuizEditorOpen, setIsQuizEditorOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingQuizModuleId, setEditingQuizModuleId] = useState<string | null>(null);
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const [reorderingModuleId, setReorderingModuleId] = useState<string | null>(null);

  // Buscar trilhas via API (bypass RLS)
  useEffect(() => {
    let cancelled = false;

    async function fetchTrails() {
      try {
        const params = areaFilter ? `?areaFilter=${areaFilter}` : '';
        const res = await fetch(`/api/admin/trails${params}`);
        if (cancelled) return;
        if (!res.ok) throw new Error('Erro ao buscar trilhas');

        const data = await res.json();
        const filtered = (data as Trail[]) || [];

        setTrails(filtered);

        // Selecionar primeira trilha automaticamente
        if (filtered.length > 0 && !selectedTrailId) {
          setSelectedTrailId(filtered[0].id);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao buscar trilhas:', error);
        toast.error('Erro ao carregar trilhas', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTrails();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFilter]);

  // Buscar módulos via API quando trilha selecionada mudar
  useEffect(() => {
    let cancelled = false;

    async function loadModules() {
      if (!selectedTrailId) {
        setModules([]);
        return;
      }

      try {
        const res = await fetch(`/api/admin/modules?trailId=${selectedTrailId}`);
        if (cancelled) return;
        if (!res.ok) throw new Error('Erro ao buscar módulos');

        const data = await res.json();
        setModules((data as Module[]) || []);
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao buscar módulos:', error);
        toast.error('Erro ao carregar módulos', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        });
      }
    }

    loadModules();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrailId]);

  async function fetchModules() {
    if (!selectedTrailId) return;

    try {
      const res = await fetch(`/api/admin/modules?trailId=${selectedTrailId}`);
      if (!res.ok) throw new Error('Erro ao buscar módulos');
      const data = await res.json();
      setModules((data as Module[]) || []);
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
      toast.error('Erro ao carregar módulos', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    }
  }

  const handleCreate = () => {
    if (!selectedTrailId) {
      toast.error('Selecione uma trilha primeiro');
      return;
    }
    setEditingModule(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setIsFormModalOpen(true);
  };

  const handleEditQuiz = (moduleId: string) => {
    setEditingQuizModuleId(moduleId);
    setIsQuizEditorOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingModule(null);
  };

  const handleCloseQuizEditor = () => {
    setIsQuizEditorOpen(false);
    setEditingQuizModuleId(null);
  };

  const handleFormSuccess = () => {
    handleCloseFormModal();
    fetchModules();
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja mover este módulo para a lixeira?')) {
      return;
    }

    try {
      setDeletingModuleId(moduleId);
      const response = await fetch('/api/admin/soft-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: moduleId, entity_type: 'module' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao excluir módulo');
      }

      toast.success('Módulo movido para a lixeira!');
      await fetchModules();
    } catch (error) {
      console.error('Erro ao excluir módulo:', error);
      toast.error('Erro ao excluir módulo', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setDeletingModuleId(null);
    }
  };

  const handleMove = async (moduleId: string, direction: 'up' | 'down') => {
    const moduleIndex = modules.findIndex((m) => m.id === moduleId);
    if (moduleIndex === -1) return;

    const newIndex = direction === 'up' ? moduleIndex - 1 : moduleIndex + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;

    const module = modules[moduleIndex];
    const targetModule = modules[newIndex];

    try {
      setReorderingModuleId(moduleId);

      // Trocar sort_order via API
      const [res1, res2] = await Promise.all([
        fetch('/api/admin/modules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: module.id, sort_order: targetModule.sort_order }),
        }),
        fetch('/api/admin/modules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetModule.id, sort_order: module.sort_order }),
        }),
      ]);

      if (!res1.ok || !res2.ok) throw new Error('Erro ao reordenar');

      await fetchModules();
    } catch (error) {
      console.error('Erro ao reordenar módulo:', error);
      toast.error('Erro ao reordenar módulo', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setReorderingModuleId(null);
    }
  };

  const getTypeBadge = (type: ModuleType) => {
    switch (type) {
      case 'video':
        return <Badge color="red">Vídeo</Badge>;
      case 'document':
        return <Badge color="blue">Documento</Badge>;
      case 'quiz':
        return <Badge color="green">Quiz</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const trailOptions = trails.map((trail) => ({
    value: trail.id,
    label: trail.name,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#7A7468] dark:text-[#9A9590]">Carregando...</p>
      </div>
    );
  }

  if (trails.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-[#7A7468] dark:text-[#9A9590] mb-4">
            {areaFilter
              ? 'Nenhuma trilha encontrada na sua área'
              : 'Nenhuma trilha cadastrada'}
          </p>
          <p className="text-sm text-[#7A7468] dark:text-[#9A9590]">
            Crie uma trilha primeiro para adicionar módulos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#2D2A26] dark:text-[#E8E5E0]">Gerenciar Módulos</h2>
          <p className="text-sm text-[#7A7468] dark:text-[#9A9590] mt-1">
            {modules.length} módulo{modules.length !== 1 ? 's' : ''} na trilha selecionada
          </p>
        </div>
        <Button
          onClick={handleCreate}
          icon={Plus}
          disabled={!selectedTrailId}
        >
          Novo Módulo
        </Button>
      </div>

      {/* Select de Trilha */}
      <Card>
        <CardContent className="p-4">
          <Select
            label="Selecione a trilha"
            options={trailOptions}
            value={selectedTrailId}
            onChange={(e) => setSelectedTrailId(e.target.value)}
            placeholder="Selecione uma trilha"
          />
        </CardContent>
      </Card>

      {/* Lista de Módulos */}
      {selectedTrailId && (
        <Card>
          <CardContent className="p-0">
            {modules.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[#7A7468] dark:text-[#9A9590] mb-2">Nenhum módulo cadastrado nesta trilha</p>
                <Button onClick={handleCreate} variant="secondary" size="sm" icon={Plus}>
                  Criar primeiro módulo
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#333333]">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="p-6 hover:bg-[#0A0A0F]/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Número e controles de ordem */}
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-sm font-medium text-[#7A7468] dark:text-[#9A9590] w-8 text-center">
                            {index + 1}
                          </span>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMove(module.id, 'up')}
                              icon={ChevronUp}
                              className="h-6 w-6 p-0"
                              disabled={index === 0 || reorderingModuleId === module.id}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMove(module.id, 'down')}
                              icon={ChevronDown}
                              className="h-6 w-6 p-0"
                              disabled={index === modules.length - 1 || reorderingModuleId === module.id}
                            />
                          </div>
                        </div>

                        {/* Informações do módulo */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-[#2D2A26] dark:text-[#E8E5E0]">
                              {module.title}
                            </h3>
                            {getTypeBadge(module.type)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#7A7468] dark:text-[#9A9590]">
                            {module.duration !== null && module.duration > 0 && (
                              <span>Duração: {module.duration} min</span>
                            )}
                            {module.type === 'quiz' && (
                              <button
                                onClick={() => handleEditQuiz(module.id)}
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <HelpCircle className="w-4 h-4" />
                                Editar Questões
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(module)}
                          icon={Edit}
                          className="h-8 w-8 p-0"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(module.id)}
                          icon={Trash2}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          disabled={deletingModuleId === module.id}
                          loading={deletingModuleId === module.id}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal do Formulário */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title={editingModule ? 'Editar Módulo' : 'Novo Módulo'}
        size="lg"
      >
        {selectedTrailId && (
          <ModuleForm
            initialData={editingModule || undefined}
            trailId={selectedTrailId}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseFormModal}
          />
        )}
      </Modal>

      {/* Modal do Editor de Quiz */}
      <Modal
        isOpen={isQuizEditorOpen}
        onClose={handleCloseQuizEditor}
        title="Editor de Questões"
        size="xl"
      >
        {editingQuizModuleId && (
          <QuizEditor moduleId={editingQuizModuleId} onClose={handleCloseQuizEditor} />
        )}
      </Modal>
    </div>
  );
}
