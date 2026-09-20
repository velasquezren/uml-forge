import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn<(...args: unknown[]) => unknown>();

vi.mock('@/lib/api', () => ({
  apiClient: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

const { downloadSpringBootZip } = await import('./backendApi');
const { defaultBackendOptions, fileNameFromDisposition, toArtifactId, toPackageName } =
  await import('./backendOptions');
type BackendOptions = ReturnType<typeof defaultBackendOptions>;

describe('Opciones de generacion del backend', () => {
  it('convierte el nombre del proyecto en un artifactId Maven valido', () => {
    expect(toArtifactId('Clinica Veterinaria')).toBe('clinica-veterinaria');
    expect(toArtifactId('Sistema Academico (Herencia)')).toBe('sistema-academico-herencia');
    expect(toArtifactId('2026 Ventas')).toBe('app-2026-ventas');
  });

  it('deriva el paquete Java del grupo y del artefacto', () => {
    expect(toPackageName('com.umlforge', 'clinica-veterinaria')).toBe(
      'com.umlforge.clinica_veterinaria',
    );
  });

  it('propone opciones por defecto coherentes con el proyecto', () => {
    const options = defaultBackendOptions('Clinica Veterinaria');
    expect(options).toEqual({
      groupId: 'com.umlforge',
      artifactId: 'clinica-veterinaria',
      packageName: 'com.umlforge.clinica_veterinaria',
      database: 'postgresql',
      serverPort: 8080,
    });
  });

  it('lee el nombre del fichero de la cabecera Content-Disposition', () => {
    expect(fileNameFromDisposition('attachment; filename="clinica.zip"', 'x.zip')).toBe(
      'clinica.zip',
    );
    expect(fileNameFromDisposition(null, 'x.zip')).toBe('x.zip');
  });
});

describe('downloadSpringBootZip', () => {
  beforeEach(() => {
    postMock.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:zip');
    URL.revokeObjectURL = vi.fn();
    // jsdom no implementa la navegacion que dispara la descarga del ancla.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('descarga el ZIP y devuelve el nombre y el numero de ficheros', async () => {
    postMock.mockReturnValue(
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(['PK'], { type: 'application/zip' })),
        headers: new Headers({
          'content-disposition': 'attachment; filename="clinica.zip"',
          'x-generated-files': '18',
        }),
      }),
    );

    const result = await downloadSpringBootZip('proj-1', defaultBackendOptions('Clinica'));

    expect(result).toEqual({ ok: true, fileName: 'clinica.zip', fileCount: 18 });
    const [path, init] = postMock.mock.calls[0] as [string, { json: BackendOptions }];
    expect(path).toBe('projects/proj-1/codegen/springboot');
    expect(init.json.groupId).toBe('com.umlforge');
  });

  it('devuelve el motivo cuando la API rechaza la generacion', async () => {
    postMock.mockReturnValue(Promise.reject(new Error('El modelo no contiene ninguna clase')));

    const result = await downloadSpringBootZip('proj-1', defaultBackendOptions('Vacio'));

    expect(result).toEqual({ ok: false, error: 'El modelo no contiene ninguna clase' });
  });
});
