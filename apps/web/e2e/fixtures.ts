/**
 * Modelo de partida con dos clases en posiciones conocidas. Importarlo evita
 * depender de donde la paleta coloque las clases nuevas, que es aleatorio, y
 * garantiza que quedan separadas para poder tirar de un conector al otro.
 */
export const DOS_CLASES_XMI = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <xmi:Documentation exporter="UML Forge" exporterVersion="1.0.0"/>
  <uml:Model xmi:type="uml:Model" xmi:id="70000000-0000-4000-8000-000000000001" name="Cardinalidad E2E">
    <packagedElement xmi:type="uml:Class" xmi:id="70000000-0000-4000-8000-000000000002" name="Origen">
    </packagedElement>
    <packagedElement xmi:type="uml:Class" xmi:id="70000000-0000-4000-8000-000000000003" name="Destino">
    </packagedElement>
  </uml:Model>
  <xmi:Extension extender="UMLForge">
    <diagramElements>
      <element xmi:idref="70000000-0000-4000-8000-000000000002" x="0" y="0"/>
      <element xmi:idref="70000000-0000-4000-8000-000000000003" x="700" y="0"/>
    </diagramElements>
  </xmi:Extension>
</xmi:XMI>`;

/** Identificadores de las dos clases del modelo de partida. */
export const CLASE_ORIGEN_ID = '70000000-0000-4000-8000-000000000002';
export const CLASE_DESTINO_ID = '70000000-0000-4000-8000-000000000003';
