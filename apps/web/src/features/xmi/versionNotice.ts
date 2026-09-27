import type { XmiVersionInfo } from '@uml-forge/xmi';

/** Aviso de versiones que acompana a la confirmacion de una importacion. */
export interface VersionNotice {
  readonly text: string;
  /** Cierto cuando importar descartaria cambios posteriores al fichero. */
  readonly warning: boolean;
}

/**
 * Compara la version del fichero con la del proyecto abierto. Solo tiene
 * sentido avisar de "version antigua" cuando el fichero se exporto de este
 * mismo proyecto; un fichero de otra herramienta o de otro proyecto no tiene
 * una revision comparable.
 */
export function describeImportVersion(
  version: XmiVersionInfo | null,
  currentModelId: string | null,
  currentRevision: number,
): VersionNotice {
  if (version === null) {
    return {
      text: `Fichero sin datos de version (de otra herramienta o de una exportacion antigua). El proyecto pasara de la version ${currentRevision} a la ${currentRevision + 1}.`,
      warning: false,
    };
  }

  const sameProject = currentModelId !== null && version.modelId === currentModelId;
  if (!sameProject) {
    return {
      text: `Version ${version.revision} de otro proyecto. El proyecto pasara de la version ${currentRevision} a la ${currentRevision + 1}.`,
      warning: false,
    };
  }

  if (version.revision < currentRevision) {
    return {
      text:
        `El fichero es la version ${version.revision} de este proyecto y la actual es la ${currentRevision}: ` +
        'se perderan los cambios hechos despues de exportarlo.',
      warning: true,
    };
  }

  if (version.revision === currentRevision) {
    return {
      text: `El fichero es la version ${version.revision} de este proyecto, la misma que la actual.`,
      warning: false,
    };
  }

  return {
    text: `El fichero es la version ${version.revision} de este proyecto, posterior a la actual (${currentRevision}).`,
    warning: false,
  };
}
