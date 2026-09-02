# 0029. Compatibilidad real del XMI 2.1 con Enterprise Architect

Fecha: 2026-09-01
Estado: Aceptado

## Contexto

La Fase 7 dejo `@uml-forge/xmi` exportando e importando XMI 2.1 y con un
roundtrip propio en verde. Al revisarlo contra lo que Sparx Enterprise Architect
escribe y espera de verdad aparecieron incompatibilidades que solo se habrian
descubierto el dia de la defensa, con la herramienta delante.

En la exportacion:

1. El espacio de nombres declarado era el de Eclipse UML2
   (`http://www.eclipse.org/uml2/3.0.0/UML`), no el de la OMG.
2. Los atributos llevaban `type="String"`, el nombre del tipo en crudo. En XMI
   `type` es siempre una referencia a otro elemento, de modo que la herramienta
   importa el atributo sin tipo.
3. Las asociaciones no declaraban `memberEnd`, que es lo que enlaza la
   asociacion con sus extremos, y usaban atributos `role` y `navigable` que no
   existen en UML 2.
4. Las cardinalidades se aplastaban a `0`/`1` y `1`/`*`: un `2..5` se exportaba
   como `1..1`.

En la importacion:

5. Solo se recorrian los `packagedElement` hijos directos del modelo, y
   Enterprise Architect anida las clases dentro de paquetes: un fichero suyo se
   importaba **vacio**.
6. Los tipos llegan como `<type xmi:idref="EAJava_String"/>`, no como atributo.
7. El extremo navegable de una asociacion viaja como `ownedAttribute` de la
   clase con el atributo `association`. Al exigir dos `ownedEnd` dentro de la
   asociacion, esta se descartaba entera; ademas ese extremo aparecia como un
   atributo fantasma de la clase.
8. Enterprise Architect exporta en `windows-1252` y el cliente leia siempre como
   UTF-8, con lo que los acentos de los nombres se corrompian.

## Decision

### Exportacion

- Espacios de nombres de la OMG: `http://schema.omg.org/spec/XMI/2.1` y
  `http://schema.omg.org/spec/UML/2.1`.
- Los tipos que no son clases ni enumeraciones del modelo se declaran como
  `uml:PrimitiveType` y las propiedades los referencian por identificador.
- Cada asociacion declara sus dos `memberEnd` y posee los extremos como
  `ownedEnd`, o `navigableOwnedEnd` cuando son navegables. El rol viaja en
  `name`, como manda UML 2.
- Las cardinalidades se escriben con sus limites exactos, calculados con
  `parseMultiplicity` del metamodelo.
- Las coordenadas del lienzo siguen en la extension propia `UMLForge`: no son
  parte del estandar y las herramientas externas las ignoran sin protestar.

### Importacion

- Se recorren los paquetes en profundidad antes de interpretar nada.
- El tipo se lee del atributo `type` o del hijo `<type xmi:idref>`/`href`.
- Se hace una primera pasada que recoge los extremos de asociacion que poseen
  las clases; una propiedad con `association` no se importa como atributo.
- La direccion se deduce de la semantica, no del orden: un extremo poseido por
  una clase significa "esta clase ve a la del otro lado", asi que su duenno es
  el origen y su tipo el destino. Cuando la asociacion posee los dos extremos,
  manda el orden de `memberEnd`.
- El cliente respeta la codificacion declarada en el prologo del XML.

## Consecuencias

- Un fichero de Enterprise Architect se importa con sus clases, herencia,
  cardinalidades y roles; y lo exportado se abre en la herramienta.
- `packages/xmi/test/enterprise-architect.test.ts` fija ambos lados con un
  fragmento realista de exportacion de la herramienta.
- La comprobacion definitiva sigue siendo abrir el fichero en Enterprise
  Architect: aqui se cubre todo lo que se puede verificar sin la herramienta.
