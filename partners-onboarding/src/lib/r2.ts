import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configuração do cliente S3 para Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'partners-videos';

/**
 * Gera uma presigned URL para acessar um vídeo no R2
 * @param key - Chave do arquivo no bucket (ex: videos/trailId/timestamp-filename.mp4)
 * @returns URL assinada válida por 1 hora
 */
export async function getSignedVideoUrl(key: string): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[r2] getSignedVideoUrl key:', key);
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(r2Client, command, {
    expiresIn: 3600, // 1 hora
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[r2] signed URL gerada:', signedUrl ? `${signedUrl.slice(0, 80)}...` : 'vazio');
  }

  return signedUrl;
}

/**
 * Faz upload de um arquivo para o Cloudflare R2
 * @param file - Buffer do arquivo a ser enviado
 * @param key - Chave do arquivo no bucket (ex: videos/trailId/timestamp-filename.mp4)
 * @param contentType - Tipo MIME do arquivo (ex: video/mp4, application/pdf)
 */
export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await r2Client.send(command);
}

/**
 * Deleta um arquivo do Cloudflare R2
 * @param key - Chave do arquivo no bucket a ser deletado
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}
