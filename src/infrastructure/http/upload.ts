import multer from 'multer';

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

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
