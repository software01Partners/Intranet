'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface CertificateDownloadButtonProps {
  trailId: string;
}

export function CertificateDownloadButton({
  trailId,
}: CertificateDownloadButtonProps) {
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
      a.download = `certificado-${trailId}.pdf`;
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
    <Button
      onClick={handleDownload}
      loading={isDownloading}
      icon={Download}
      iconPosition="left"
      variant="secondary"
      className="w-full"
    >
      Baixar PDF
    </Button>
  );
}
