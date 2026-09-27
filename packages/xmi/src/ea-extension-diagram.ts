import { eaElementType, type Classifier, type EaExportContext } from './ea-context.js';
import { eaDiagramUid, eaId } from './ea-ids.js';
import { escapeXml } from './xml-text.js';

/** Margen desde la esquina del diagrama hasta el primer elemento. */
const MARGIN = 40;
/** Medidas aproximadas de la fuente por defecto de Enterprise Architect. */
const LINE_HEIGHT = 15;
const CHAR_WIDTH = 7;
const MIN_WIDTH = 150;
const MAX_WIDTH = 420;

/** Preferencias de visualizacion: todo visible y notacion UML 2.1. */
const STYLE1 =
  'ShowPrivate=1;ShowProtected=1;ShowPublic=1;HideRelationships=0;Locked=0;Border=1;HighlightForeign=1;PackageContents=1;SequenceNotes=0;ScalePrintImage=0;PPgs.cx=0;PPgs.cy=0;ShowDetails=0;Orientation=P;Zoom=100;ShowTags=0;OpParams=1;VisibleAttributeDetail=0;ShowOpRetType=1;ShowIcons=1;CollabNums=0;HideProps=0;ShowReqs=0;ShowCons=0;PaperSize=9;HideParents=0;UseAlias=0;HideAtts=0;HideOps=0;HideStereo=0;HideElemStereo=0;ShowTests=0;ShowMaint=0;ConnectorNotation=UML 2.1;ExplicitNavigability=0;ShowShape=1;AdvancedElementProps=1;AdvancedFeatureProps=1;AdvancedConnectorProps=1;m_bElementClassifier=1;ShowNotes=0;SuppressBrackets=0;SuppConnectorLabels=0;PrintPageHeadFoot=0;ShowAsList=0;';
const STYLE2 =
  'ExcludeRTF=0;DocAll=0;HideQuals=0;AttPkg=1;ShowTests=0;ShowMaint=0;SuppressFOC=1;MatrixActive=0;SwimlanesActive=1;KanbanActive=0;MatrixLineWidth=1;MatrixLineClr=0;MatrixLocked=0;TConnectorNotation=UML 2.1;TExplicitNavigability=0;AdvancedElementProps=1;AdvancedFeatureProps=1;AdvancedConnectorProps=1;m_bElementClassifier=1;ProfileData=;MDGDgm=;STBLDgm=;ShowNotes=0;VisibleAttributeDetail=0;ShowOpRetType=1;SuppressBrackets=0;SuppConnectorLabels=0;PrintPageHeadFoot=0;ShowAsList=0;SuppressedCompartments=;Theme=:119;';

/** Rectangulo de un elemento en coordenadas de Enterprise Architect. */
export interface EaGeometry {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Seccion `diagrams`: un diagrama de clases (`Logical`) dentro del paquete
 * exportado, con cada clasificador en la posicion que tenia en el lienzo. Es lo
 * que permite que Enterprise Architect abra el diagrama ya dibujado en lugar de
 * dejar las clases sueltas en el navegador del proyecto. Los conectores no se
 * enumeran: la herramienta dibuja por si sola las relaciones entre elementos
 * presentes en el diagrama.
 */
export function eaDiagramLines(context: EaExportContext, indent: string): string[] {
  const { model } = context;
  const classifiers: Classifier[] = [...model.classes, ...model.enums];
  const geometries = computeGeometries(classifiers, (type) => context.types.displayName(type));
  const inner = `${indent}    `;
  const width = Math.max(0, ...[...geometries.values()].map((g) => g.right)) + MARGIN;
  const height = Math.max(0, ...[...geometries.values()].map((g) => g.bottom)) + MARGIN;

  const lines = [
    `${indent}<diagrams>`,
    `${indent}  <diagram xmi:id="${eaId(`${model.id}-diagram`)}">`,
    `${inner}<model package="${context.packageId}" localID="1" owner="${context.packageId}"/>`,
    `${inner}<properties name="${escapeXml(model.name)}" type="Logical"/>`,
    `${inner}<project author="${escapeXml(context.author)}" version="1.0" created="${context.created}" modified="${context.modified}"/>`,
    `${inner}<style1 value="${STYLE1}DocSize.cx=${width};DocSize.cy=${height};"/>`,
    `${inner}<style2 value="${STYLE2}"/>`,
    `${inner}<swimlanes value="locked=false;orientation=0;width=0;inbar=false;names=false;color=-1;bold=false;fcol=0;tcol=-1;ofCol=-1;ufCol=-1;hl=1;ufh=0;hh=0;cls=0;bw=0;hli=0;bro=0;"/>`,
    `${inner}<matrixitems value="locked=false;matrixactive=false;swimlanesactive=true;kanbanactive=false;width=1;clrLine=0;"/>`,
    `${inner}<extendedProperties/>`,
  ];

  if (classifiers.length === 0) {
    lines.push(`${inner}<elements/>`);
  } else {
    lines.push(`${inner}<elements>`);
    classifiers.forEach((classifier, index) => {
      const geometry = geometries.get(classifier.id);
      if (geometry === undefined) {
        return;
      }
      lines.push(
        `${inner}  <element geometry="Left=${geometry.left};Top=${geometry.top};Right=${geometry.right};Bottom=${geometry.bottom};" subject="${eaId(classifier.id)}" seqno="${index + 1}" style="DUID=${eaDiagramUid(classifier.id)};"/>`,
      );
    });
    lines.push(`${inner}</elements>`);
  }

  lines.push(`${indent}  </diagram>`, `${indent}</diagrams>`);
  return lines;
}

/**
 * Traslada las posiciones del lienzo al primer cuadrante, porque el lienzo
 * admite coordenadas negativas y Enterprise Architect no, y estima el tamanno
 * de cada caja por su contenido para que no se corten nombres ni atributos.
 */
export function computeGeometries(
  classifiers: readonly Classifier[],
  displayName: (type: string) => string,
): Map<string, EaGeometry> {
  const minX = Math.min(0, ...classifiers.map((c) => c.position.x));
  const minY = Math.min(0, ...classifiers.map((c) => c.position.y));
  const geometries = new Map<string, EaGeometry>();

  for (const classifier of classifiers) {
    const { width, height } = estimateSize(classifier, displayName);
    const left = Math.round(classifier.position.x - minX) + MARGIN;
    const top = Math.round(classifier.position.y - minY) + MARGIN;
    geometries.set(classifier.id, { left, top, right: left + width, bottom: top + height });
  }

  return geometries;
}

/** Tamanno de la caja segun el texto que tendra que mostrar. */
function estimateSize(
  classifier: Classifier,
  displayName: (type: string) => string,
): { width: number; height: number } {
  const texts = [classifier.name];
  let rows = 0;
  let compartments = 1;
  // Interfaces y enumeraciones llevan una linea mas con el estereotipo.
  const hasStereotype = eaElementType(classifier) !== 'Class';

  if ('literals' in classifier) {
    texts.push(...classifier.literals);
    rows += classifier.literals.length;
    compartments += 1;
  } else {
    texts.push(...classifier.attributes.map((a) => `- ${a.name}: ${displayName(a.type)}`));
    texts.push(
      ...classifier.operations.map(
        (o) => `+ ${o.name}(${o.parameters.map((p) => p.name).join(', ')})`,
      ),
    );
    rows += classifier.attributes.length + classifier.operations.length;
    compartments += 2;
  }

  const longest = Math.max(...texts.map((text) => text.length));
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest * CHAR_WIDTH + 30));
  const header = hasStereotype ? 45 : 30;
  const height = Math.max(70, header + rows * LINE_HEIGHT + compartments * 8);
  return { width, height };
}
