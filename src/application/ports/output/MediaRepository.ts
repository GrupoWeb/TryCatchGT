/** Imagen almacenada en la base de datos (avatares, portadas del blog). */
export interface StoredMedia {
  mime: string;
  data: Buffer;
}

export interface MediaRepository {
  // Guarda la imagen ya validada y devuelve su id (usado en la URL /api/media/:id).
  save(input: { mime: string; data: Buffer; size: number; createdBy: number | null }): Promise<number>;
  // Devuelve el contenido para servirlo, o null si no existe.
  findById(id: number): Promise<StoredMedia | null>;
}
