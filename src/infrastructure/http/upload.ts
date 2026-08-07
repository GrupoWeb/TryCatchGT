import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Las imágenes subidas se guardan bajo public/uploads, servido como estático.
export const uploadsDir = path.join(process.cwd(), 'src', 'presentation', 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

/**
 * Detecta el tipo real de la imagen por sus "magic bytes" (firma binaria del
 * contenido), NO por el mimetype que declara el cliente, que es falsificable.
 * Devuelve el MIME reconocido o null si el contenido no es una imagen soportada.
 */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';

  // GIF: "GIF87a" o "GIF89a"
  const gif = buf.toString('ascii', 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif';

  // WEBP: contenedor RIFF con marca "WEBP" en el offset 8
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';

  // AVIF: contenedor ISO-BMFF con caja "ftyp" y marca "avif"/"avis"
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }

  return null;
}

// Buffer en memoria: permite inspeccionar el contenido antes de tocar el disco,
// así nunca se escribe un archivo cuyo contenido no sea una imagen válida.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
});

/**
 * Valida el contenido real del archivo y, si es una imagen soportada, lo escribe
 * en uploads con un nombre aleatorio y la extensión que corresponde al tipo
 * detectado (no a la que envió el cliente). Devuelve el nombre del archivo.
 * Lanza Error con mensaje apto para el cliente si el contenido no es válido.
 */
export function saveValidatedImage(file: Express.Multer.File): string {
  const mime = sniffImageMime(file.buffer);
  if (!mime) {
    throw new Error('El archivo no es una imagen válida. Usa JPG, PNG, WEBP, GIF o AVIF.');
  }
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXT_BY_MIME[mime]}`;
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return filename;
}
