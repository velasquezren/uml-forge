import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { ROOT_CLASSES, ROOT_ENUMS, ROOT_META, ROOT_RELATIONSHIPS } from '@uml-forge/uml-core';

/**
 * Historial local de deshacer y rehacer sobre las cuatro raices del modelo.
 * `onChange` se invoca solo cuando deshacer o rehacer cambian algo de verdad,
 * porque eso tambien es una revision nueva del modelo.
 */
export function useUndoHistory(ydoc: Y.Doc, onChange: () => void) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const undoManager = new Y.UndoManager(
      [
        ydoc.getMap(ROOT_CLASSES),
        ydoc.getMap(ROOT_ENUMS),
        ydoc.getMap(ROOT_RELATIONSHIPS),
        ydoc.getMap(ROOT_META),
      ],
      { captureTimeout: 400 },
    );
    undoManagerRef.current = undoManager;

    const refreshHistory = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };

    undoManager.on('stack-item-added', refreshHistory);
    undoManager.on('stack-item-popped', refreshHistory);
    undoManager.on('stack-cleared', refreshHistory);

    return () => {
      undoManager.destroy();
      undoManagerRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
    };
  }, [ydoc]);

  const undo = useCallback(() => {
    if (undoManagerRef.current?.undo()) {
      onChangeRef.current();
    }
  }, []);

  const redo = useCallback(() => {
    if (undoManagerRef.current?.redo()) {
      onChangeRef.current();
    }
  }, []);

  return { canUndo, canRedo, undo, redo };
}
