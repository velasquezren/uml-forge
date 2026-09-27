import { describe, expect, it } from 'vitest';
import { readImageAsBase64, stripDataUrlPrefix } from './imageFile';

describe('imageFile', () => {
  it('quita el prefijo data: que anade el navegador', () => {
    expect(stripDataUrlPrefix('data:image/png;base64,QUJD')).toBe('QUJD');
    expect(stripDataUrlPrefix('QUJD')).toBe('QUJD');
  });

  it('rechaza formatos que el proveedor no admite', async () => {
    const file = new File(['contenido'], 'diagrama.gif', { type: 'image/gif' });

    await expect(readImageAsBase64(file)).resolves.toEqual({
      ok: false,
      error: 'Formato no admitido: usa PNG, JPEG o WebP',
    });
  });

  it('rechaza imagenes de mas de 20 MB', async () => {
    const file = new File(['x'], 'grande.png', { type: 'image/png' });
    // No hace falta reservar 21 MB de memoria para probar el limite.
    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 });

    await expect(readImageAsBase64(file)).resolves.toEqual({
      ok: false,
      error: 'La imagen supera los 20 MB admitidos',
    });
  });

  it('devuelve la imagen en base64 puro lista para la API', async () => {
    const file = new File(['ABC'], 'diagrama.png', { type: 'image/png' });

    const result = await readImageAsBase64(file);

    expect(result).toEqual({ ok: true, imageBase64: 'QUJD', mimeType: 'image/png' });
  });
});
