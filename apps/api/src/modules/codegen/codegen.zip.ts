import archiver from 'archiver';
import type { GeneratedFile } from '@uml-forge/codegen-springboot';

/**
 * Comprime en memoria los ficheros generados. Los proyectos Spring Boot que
 * produce el generador rondan las decenas de kilobytes, de modo que no compensa
 * escribir en disco ni exponer un almacenamiento temporal.
 */
export function createZipArchive(
  files: readonly GeneratedFile[],
  rootFolder: string,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('warning', (error: Error) => reject(error));
    archive.on('error', (error: Error) => reject(error));
    archive.on('end', () => resolve(Buffer.concat(chunks)));

    for (const file of files) {
      archive.append(file.content, { name: `${rootFolder}/${file.path}` });
    }

    void archive.finalize();
  });
}
