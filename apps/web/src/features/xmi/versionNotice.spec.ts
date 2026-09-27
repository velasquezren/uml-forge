import { describe, expect, it } from 'vitest';
import { describeImportVersion } from './versionNotice';

const projectId = '10000000-0000-4000-8000-000000000001';

describe('aviso de versiones al importar', () => {
  it('avisa cuando el fichero es una version anterior del mismo proyecto', () => {
    const notice = describeImportVersion(
      { revision: 3, modelId: projectId, updatedAt: null },
      projectId,
      8,
    );
    expect(notice.warning).toBe(true);
    expect(notice.text).toContain('version 3');
  });

  it('no avisa con ficheros de otra herramienta o de otro proyecto', () => {
    expect(describeImportVersion(null, projectId, 8).warning).toBe(false);
    expect(
      describeImportVersion({ revision: 1, modelId: 'otro', updatedAt: null }, projectId, 8)
        .warning,
    ).toBe(false);
  });

  it('reconoce la misma version', () => {
    const notice = describeImportVersion(
      { revision: 8, modelId: projectId, updatedAt: null },
      projectId,
      8,
    );
    expect(notice.warning).toBe(false);
    expect(notice.text).toContain('la misma');
  });
});
