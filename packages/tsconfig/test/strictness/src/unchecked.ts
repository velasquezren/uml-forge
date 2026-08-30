// Sonda negativa: este fichero DEBE fallar mientras noUncheckedIndexedAccess
// siga activo en el preset base. Si algun dia compila, el rigor se ha perdido.
export function unsafeFirst(labels: string[]): string {
  const first: string = labels[0];
  return first;
}
