'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Award, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailId: string;
  trailName?: string;
}

export function CertificateModal({
  isOpen,
  onClose,
  trailId,
  trailName,
}: CertificateModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const response = await fetch('/api/certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trailId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao gerar certificado');
      }

      // Criar blob e fazer download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-${trailName?.replace(/\s+/g, '-') || 'trilha'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Certificado baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar certificado:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao baixar certificado'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Parabéns! Trilha concluída! 🎉"
      size="md"
    >
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        <div className="w-20 h-20 rounded-full bg-[#D4A053]/10 dark:bg-[#D4A053]/15 flex items-center justify-center">
          <Award className="w-10 h-10 text-[#D4A053]" />
        </div>

        <div className="space-y-2">
          <p className="text-[#2D2A26] dark:text-[#E8E5E0] text-lg">
            Você concluiu com sucesso esta trilha!
          </p>
          {trailName && (
            <p className="text-[#7A7468] dark:text-[#9A9590] text-sm">
              {trailName}
            </p>
          )}
          <p className="text-[#7A7468] dark:text-[#9A9590] text-sm mt-4">
            Baixe seu certificado de conclusão para compartilhar sua conquista.
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Fechar
          </Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            icon={isDownloading ? Loader2 : Download}
            loading={isDownloading}
            className="flex-1"
          >
            Baixar Certificado
          </Button>
        </div>
      </div>
    </Modal>
  );
}
