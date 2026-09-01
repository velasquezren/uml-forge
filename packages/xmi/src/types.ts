import type { UMLModel } from '@uml-forge/uml-core';

/** Opciones para exportar un modelo UML a XMI 2.1. */
export interface XmiExportOptions {
  readonly xmiVersion: '2.1';
  readonly exporter: string;
  readonly exporterVersion: string;
  readonly encoding: 'UTF-8';
}

/** Opciones para importar un documento XMI 2.1. */
export interface XmiImportOptions {
  readonly autoLayout: boolean;
  readonly fallbackName: string;
}

/** Elemento de nodo para calculo de autolayout. */
export interface LayoutNode {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  x: number;
  y: number;
  layer: number;
}

export type { UMLModel };
