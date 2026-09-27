# 0033. Dialecto XMI de Enterprise Architect con diagrama de clases

Fecha: 2026-09-27
Estado: Aceptado. Amplia el ADR 0029.

## Contexto

Tras el ADR 0029, Enterprise Architect importaba las clases de un fichero de UML
Forge, pero no creaba ningun diagrama: habia que crear a mano un diagrama de
clases y arrastrar cada clase desde el navegador del proyecto. La exportacion ya
incluia una extension `Enterprise Architect` con un bloque `<diagrams>`, pero la
herramienta la ignoraba por varios motivos:

1. El diagrama se declaraba dentro del `uml:Model`, que Enterprise Architect no
   trata como paquete. Un diagrama sin paquete que lo contenga se descarta.
2. Los identificadores eran UUID sueltos (`3f2a...`) o derivados como
   `<uuid>-src`. Enterprise Architect enlaza el diagrama con sus elementos a
   traves de identificadores con su forma propia, `EAID_XXXXXXXX_XXXX_...` y
   `EAPK_...` para paquetes.
3. El documento se declaraba exportado por `UML Forge`. Enterprise Architect solo
   lee su propia extension cuando el documento declara su dialecto.

Al revisar la exportacion aparecieron ademas:

4. Las dependencias se exportaban como asociaciones.
5. `navigableOwnedEnd` se escribia como contenedor del extremo, cuando en UML 2
   es una referencia a un `ownedEnd`.
6. Los primitivos se declaraban como `uml:PrimitiveType` sueltos en el paquete y
   aparecian como elementos en el navegador del proyecto al importar.

En la importacion:

7. Una clase llamada `Candidate`, `Update` o `Point` usada como tipo se leia como
   `Date` o `Integer`, porque el nombre del tipo se comparaba con los primitivos
   antes de comprobar si era una clase del documento.
8. Cualquier tipo desconocido se convertia en un UUID nuevo que no apuntaba a
   nada.

## Decision

El fichero imita la estructura de uno exportado por la propia herramienta:

- `xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"`. La
  identidad de UML Forge viaja en su propia extension `UMLForge`.
- Un unico `uml:Package` (`EAPK_`) dentro del `uml:Model` contiene todos los
  elementos; el diagrama pertenece a ese paquete.
- Todo `xmi:id` tiene la forma `EAID_`/`EAPK_`. Los UUID del modelo se conservan
  dentro del identificador; los derivados (extremos, literales, cardinalidades,
  retorno) se calculan con un hash determinista marcado como UUID version 5, de
  modo que exportar dos veces produce el mismo fichero y al importar se
  recuperan los UUID originales.
- Los tipos primitivos se referencian como `EAJava_<Nombre>` y se declaran en la
  seccion `primitivetypes` de la extension.
- La extension incluye `elements` (paquete, clases con lenguaje Java, tipos
  legibles de atributos y operaciones), `connectors` (tipo, direccion y en que
  extremo va el rombo) y `diagrams`: un diagrama `Logical` con cada clasificador
  en la posicion que tenia en el lienzo, trasladada al primer cuadrante y con un
  tamanno estimado por su contenido. Los conectores no se enumeran en el
  diagrama: Enterprise Architect dibuja por si solo las relaciones entre los
  elementos presentes.
- Las dependencias se exportan como `uml:Dependency`; `navigableOwnedEnd` como
  referencia.
- La extension `UMLForge` conserva las coordenadas exactas y la revision del
  modelo (ADR 0034).

En la importacion, los clasificadores se registran antes de leer ningun tipo,
un tipo desconocido se degrada a `String`, se leen `uml:Dependency`,
`uml:Usage` y `uml:Realization`, se respetan los extremos `EAID_src`/`EAID_dst`
para orientar una asociacion bidireccional, y el nombre del modelo es el del
paquete unico cuando el fichero viene de Enterprise Architect (`EA_Model`).

## Consecuencias

- Al importar en Enterprise Architect (Publicar > Importar XMI) se crea el
  paquete con su diagrama de clases ya dibujado.
- La comprobacion definitiva sigue siendo abrir el fichero con la herramienta,
  que no se puede ejecutar en la integracion continua. Las pruebas de
  `packages/xmi/test/ea-diagram.test.ts` fijan lo que si se puede verificar: que
  todo identificador es unico y tiene la forma de la herramienta, que cada
  objeto del diagrama apunta a un elemento existente, que el diagrama esta en
  el paquete y que la ida y vuelta conserva identificadores, dependencias,
  navegabilidad y posiciones.
- Otras herramientas que no conozcan los tipos `EAJava_` veran esos atributos
  sin tipo; Enterprise Architect es la herramienta de referencia del proyecto.
