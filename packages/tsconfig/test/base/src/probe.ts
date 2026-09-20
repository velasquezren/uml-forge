// Sonda del preset base: debe compilar sin errores.
export interface Probe {
  readonly id: string;
  readonly labels: readonly string[];
}

export function firstLabel(probe: Probe): string | undefined {
  // noUncheckedIndexedAccess obliga a tratar el acceso por indice como opcional.
  const label: string | undefined = probe.labels[0];
  return label;
}

export function describeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value) ?? 'desconocido';
}
