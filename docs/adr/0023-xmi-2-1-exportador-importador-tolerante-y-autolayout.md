# 0023. XMI 2.1: exportacion, importacion tolerante y autolayout jerarquico

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

La interoperabilidad con herramientas CASE externas de modelado UML (como Visual Paradigm,
Enterprise Architect, Papyrus, MagicDraw o Eclipse UML2) requiere que UML Forge sea capaz
de exportar e importar modelos bajo el estandar OMG XMI 2.1 (UML 2.5).

Dado que diferentes herramientas generan variaciones en espacios de nombres, prefijos de
etiquetas XML y formatos de identificadores no conformes a UUID, el importador debe ser
altamente tolerante a fallos y ser capaz de asignar coordenadas espaciales mediante un algoritmo
de auto-layout jerarquico determinista cuando las posiciones del diagrama no esten presentes.

## Decision

1. **Paquete dedicado `@uml-forge/xmi`**:
   - Construido como libreria del monorepo con compilacion dual ESM/CJS (ADR 0010).
   - Dependencia exclusiva de `@uml-forge/uml-core` como fuente de verdad y `fast-xml-parser`
     como motor de parseo XML sin enlaces nativos ni dependencias pesadas.
   - Retorno funcional mediante `Result<T, XmiError>` de acuerdo a ADR 0007.

2. **Serializador OMG XMI 2.1 (`exportXmi`)**:
   - Genera documentos XML conformes al esquema OMG XMI 2.1 (`http://schema.omg.org/spec/XMI/2.1`).
   - Mapea clases concretas y abstractas (`uml:Class`, `isAbstract`), interfaces (`uml:Interface`),
     enumeraciones (`uml:Enumeration`), atributos con multiplicidad e identificador (`ownedAttribute`),
     operaciones y parametros (`ownedOperation`, `ownedParameter`), generalizaciones (`generalization`),
     realizaciones (`interfaceRealization`), y asociaciones/composiciones con multiplicidades en extremos (`ownedEnd`).
   - Exporta posiciones 2D en una extension estandarizada `<xmi:Extension extender="UMLForge">`.

3. **Importador tolerante (`importXmi`)**:
   - Acepta raices `xmi:XMI`, `XMI`, `uml:Model` o `Model`.
   - Traduce cualquier formato de identificador externo a UUIDs validos y consistentes mediante `IdMapper`.
   - Normaliza tipos primitivos y visibilidades (`+`, `-`, `#`, etc.).
   - Extrae composiciones, agregaciones y relaciones de herencia e interfaz.

4. **Algoritmo de Auto-Layout (`autoLayout`)**:
   - Calcula la profundidad jerarquica mediante orden topologico en el grafo de herencia e interfaces.
   - Organiza los nodos en capas horizontales centradas con espaciado constante y sin superposiciones.
   - Se ejecuta automaticamente cuando los nodos importados carecen de coordenadas espaciales.

## Consecuencias

- Se garantiza la compatibilidad bidireccional (roundtrip) sin perdida de semantica estructural.
- Los modelos creados en herramientas externas se visualizan y editan de inmediato en el canvas.
