import type { AnalyzedModel, CodegenOptions, GeneratedFile } from '../types.js';
import { entityBasePath } from './controller.js';
import { POSTMAN_DIR, creationOrder } from './postman.js';
import { buildRequestBody, idVariableName, referencedTargets } from './postman-samples.js';

/** Seccion por entidad: rutas, cuerpo de ejemplo y relaciones que envia. */
function entitySections(analyzed: AnalyzedModel): string {
  const created = new Set<string>();
  return creationOrder(analyzed)
    .map((entity, index) => {
      const base = entityBasePath(entity);
      const body = buildRequestBody(entity, analyzed, 'create', created);
      const refs = referencedTargets(entity, analyzed).filter((t) =>
        created.has(idVariableName(t.entity)),
      );
      created.add(idVariableName(entity));
      const refNote =
        refs.length === 0
          ? ''
          : `\nLas relaciones se envian con el id de un registro que ya existe: ${refs
              .map((r) => `\`${r.fieldName}\` (${r.entity.javaClassName})`)
              .join(', ')}. En la coleccion, \`{{...Id}}\` lo rellena el \`Crear\` de esa entidad;
si escribes la peticion a mano, pon el numero (\`"id": 1\`).\n`;

      return `### ${index + 1}. ${entity.javaClassName}

| Peticion | Metodo | Ruta | Respuesta esperada |
| -------- | ------ | ---- | ------------------ |
| Crear | POST | \`${base}\` | 201 con el registro y su \`id\` |
| Listar | GET | \`${base}\` | 200 con una lista |
| Obtener por id | GET | \`${base}/{id}\` | 200, o 404 si no existe |
| Actualizar | PUT | \`${base}/{id}\` | 200, o 404 si no existe |
| Eliminar | DELETE | \`${base}/{id}\` | 204 sin cuerpo, o 404 |

Cuerpo de \`Crear ${entity.javaClassName}\` (cabecera \`Content-Type: application/json\`):

\`\`\`json
${body}
\`\`\`
${refNote}`;
    })
    .join('\n');
}

/** Genera `postman/README.md`, la guia para probar el backend con Postman. */
export function generatePostmanGuide(
  options: CodegenOptions,
  analyzed: AnalyzedModel,
): GeneratedFile {
  const base = `http://localhost:${options.serverPort}`;
  const content = `# Probar ${options.applicationName} con Postman

Esta carpeta contiene:

- \`${options.artifactId}.postman_collection.json\`: todas las peticiones del CRUD,
  con pruebas automaticas que comprueban cada respuesta.
- \`${options.artifactId}.postman_environment.json\`: el entorno \`${options.applicationName} local\`
  con la variable \`baseUrl\` = \`${base}\`.

## 1. Arrancar el backend

Desde la raiz del proyecto (ver el README principal):

\`\`\`
mvnw.cmd spring-boot:run      (Windows)
./mvnw spring-boot:run        (Linux o macOS)
\`\`\`

Espera a ver \`Started ... in N seconds\` en la consola. Para comprobarlo abre
<${base}/swagger-ui.html> en el navegador.

## 2. Importar en Postman

1. Abre Postman y pulsa **Import** (arriba a la izquierda).
2. Arrastra los dos ficheros \`.json\` de esta carpeta y confirma con **Import**.
3. En el selector de entornos (arriba a la derecha) elige **${options.applicationName} local**.

Si usas Postman en el navegador, instala el **Postman Agent**: sin el, la web no
puede llamar a \`localhost\`. Si arrancas en otro puerto, cambia \`baseUrl\` en
el entorno.

## 3. Ejecutar la coleccion completa

1. Pasa el raton sobre la coleccion **${options.applicationName} API**, pulsa los tres
   puntos y elige **Run collection**.
2. Deja el orden tal como viene y pulsa **Run**.

Las carpetas estan numeradas en el orden correcto: primero se comprueba que la
API responde, despues se crea cada entidad antes que las que dependen de ella, y
al final la carpeta **Limpieza** borra todo en orden inverso. Cada \`Crear\`
guarda el id devuelto en una variable de la coleccion (por ejemplo
\`{{orderId}}\`), que usan las peticiones siguientes. Todas las pruebas deben
salir en verde.

## 4. Probar peticion a peticion

Abre una peticion y pulsa **Send**. La pestana **Test Results** muestra si la
respuesta es la esperada. Ejecuta antes el \`Crear\` de la misma carpeta (y el de
las carpetas anteriores): las peticiones por id y las relaciones usan las
variables que rellena.

## 5. Endpoints y cuerpos de ejemplo

${entitySections(analyzed) || 'El modelo no tiene entidades concretas: solo hay comprobaciones.\n'}
## 6. Reglas que conviene saber

- **PUT sustituye el registro entero.** Un campo que no se envia queda a \`null\`.
  En una composicion, actualizar el padre sin su lista de hijos los borra.
- **Las relaciones se envian como \`{ "id": N }\`** desde el lado que guarda la
  clave ajena. Las listas del otro lado (por ejemplo los hijos de un padre) se
  devuelven en los GET, pero no se guardan desde ahi: crea cada hijo con la
  referencia a su padre.
- **Las entidades anidadas se devuelven sin sus propias relaciones**, para que el
  JSON no entre en un ciclo.
- **La respuesta de POST repite la referencia tal como se envio**
  (\`{ "id": 1, ...: null }\`). El GET posterior la devuelve completa.
- **Campos obligatorios**: si falta uno, la base de datos lo rechaza y la API
  responde 500. Revisa la consola del backend para ver el campo.
- Con H2 en memoria los datos se pierden al parar el backend.

## 7. Problemas frecuentes

- **Error: connect ECONNREFUSED**: el backend no esta arrancado o escucha en otro
  puerto. Revisa \`baseUrl\`.
- **400 Bad Request en un Crear con relaciones**: la variable del id esta vacia
  porque no se ejecuto antes el \`Crear\` de la entidad referenciada.
- **404 en Obtener, Actualizar o Eliminar**: el registro no existe; vuelve a
  ejecutar el \`Crear\` de esa carpeta.
- **Las variables no se resuelven (\`{{baseUrl}}\` en rojo)**: selecciona el
  entorno o usa la variable de la propia coleccion, que ya trae el valor.

## 8. Alternativa: importar desde Swagger

Postman tambien puede crear una coleccion desde la especificacion OpenAPI:
**Import**, pega \`${base}/v3/api-docs\` y confirma. Esa coleccion no trae las
pruebas ni los cuerpos con datos de ejemplo de la carpeta \`${POSTMAN_DIR}/\`.
`;

  return { path: `${POSTMAN_DIR}/README.md`, content };
}
