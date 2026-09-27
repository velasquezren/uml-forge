import { useCallback, useEffect, useState } from 'react';
import type * as Y from 'yjs';
import { bumpRevision, readRevision, ROOT_VERSIONING } from '../lib/versioning';

/** Revision viva del modelo, sincronizada con la de los demas participantes. */
export function useModelRevision(ydoc: Y.Doc) {
  const [revision, setRevision] = useState(() => readRevision(ydoc));

  useEffect(() => {
    const versioning = ydoc.getMap<unknown>(ROOT_VERSIONING);
    const refresh = () => setRevision(readRevision(ydoc));
    versioning.observe(refresh);
    refresh();
    return () => versioning.unobserve(refresh);
  }, [ydoc]);

  const bump = useCallback(() => {
    setRevision(bumpRevision(ydoc));
  }, [ydoc]);

  return { revision, bumpRevision: bump };
}
