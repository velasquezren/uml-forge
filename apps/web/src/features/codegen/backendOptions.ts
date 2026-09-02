/** Opciones de generacion que viajan al endpoint de codegen. */
export interface BackendOptions {
  groupId: string;
  artifactId: string;
  packageName: string;
  database: 'postgresql' | 'h2';
  serverPort: number;
}

/** Convierte un nombre de proyecto en un artifactId Maven valido. */
export function toArtifactId(projectName: string): string {
  const slug = projectName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-zA-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
  // El generador exige que empiece por letra minuscula.
  return /^[a-z]/u.test(slug) ? slug : `app-${slug || 'demo'}`;
}

/** Deriva el paquete raiz Java a partir del grupo y del artefacto. */
export function toPackageName(groupId: string, artifactId: string): string {
  const suffix = artifactId.replace(/-/gu, '_').replace(/[^a-z0-9_]/gu, '');
  return `${groupId}.${/^[a-z]/u.test(suffix) ? suffix : `app_${suffix}`}`;
}

/** Opciones iniciales que se muestran en el formulario de generacion. */
export function defaultBackendOptions(projectName: string | undefined): BackendOptions {
  const artifactId = toArtifactId(projectName ?? 'demo');
  const groupId = 'com.umlforge';
  return {
    groupId,
    artifactId,
    packageName: toPackageName(groupId, artifactId),
    database: 'postgresql',
    serverPort: 8080,
  };
}

/** Lee el nombre del fichero de la cabecera Content-Disposition. */
export function fileNameFromDisposition(header: string | null, fallback: string): string {
  if (!header) {
    return fallback;
  }
  const match = /filename="?([^";]+)"?/u.exec(header);
  return match?.[1] ?? fallback;
}
