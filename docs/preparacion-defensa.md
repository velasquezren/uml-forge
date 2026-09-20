# Preparacion de la defensa

Checklist de todo lo necesario para presentar UML Forge: versiones, puesta en
marcha, guion por escenario, trampas conocidas y lo que queda por verificar.

Ultima revision: 1 de septiembre de 2026.

## 1. Estado del proyecto

Las once fases del plan estan completas. Verificado en local:

| Comprobacion                       | Resultado               |
| ---------------------------------- | ----------------------- |
| `pnpm format:check`                | Limpio                  |
| `pnpm typecheck`                   | 9 de 9 paquetes         |
| `pnpm lint`                        | Sin errores ni avisos   |
| `pnpm test`                        | 269 pruebas             |
| `pnpm e2e`                         | 11 pruebas de navegador |
| `pnpm e2e` sobre los contenedores  | 11 pruebas de navegador |
| `pnpm build`                       | 5 de 5                  |
| `mvn compile` del backend generado | Compila                 |

## 2. Software y versiones

| Pieza                   | Version                   | Nota                                                         |
| ----------------------- | ------------------------- | ------------------------------------------------------------ |
| Node                    | 22 o superior             | Obligatorio: lo exige `@hocuspocus/server`                   |
| pnpm                    | 11.24.0                   | Fijada en `packageManager`                                   |
| Docker y Docker Compose | 2.x                       | Solo para PostgreSQL                                         |
| PostgreSQL              | 16                        | `docker compose up -d`                                       |
| JDK                     | Temurin 21                | Para compilar el backend generado                            |
| Maven                   | 3.9                       | Idem                                                         |
| Spring Boot generado    | 3.3.5                     | El stack del proyecto menciona 3.5.x; el generador usa 3.3.5 |
| Gemini                  | modelo `gemini-2.5-flash` | Requiere `GEMINI_API_KEY` de Google AI Studio                |
| Ollama                  | ultima estable            | No exige version concreta                                    |
| Modelo de texto local   | `qwen2.5:3b`              | Unos 2 GB. Alternativa: `llama3.2:3b`                        |
| Modelo de vision local  | `llava:7b`                | Unos 4,7 GB. Mas ligero: `moondream`                         |
| Enterprise Architect    | 15, 16 o 17               | Cualquiera con "Import Package from XMI"                     |
| Navegador               | Chrome, Edge o Brave      | Firefox no soporta la Web Speech API: el dictado cae a texto |

UML Forge no depende de una version concreta de Ollama: usa `/api/tags` y
`/api/generate` con `format: "json"` e `images`, presentes desde hace tiempo.

## 3. Puesta en marcha

### Todo en contenedores (recomendado para la defensa)

```bash
sudo systemctl start docker
cp .env.example .env          # si aun no existe
docker compose --profile full up --build
```

La PWA queda en <http://localhost:8080> y la API en <http://localhost:3000>. El
contenedor de la API aplica las migraciones y siembra los datos de demostracion
antes de servir, de modo que no hay ningun paso manual.

### Con las herramientas de desarrollo

```bash
sudo systemctl start docker
docker compose up -d          # solo PostgreSQL

pnpm install
cp .env.example .env
pnpm --filter @uml-forge/api exec prisma migrate deploy
pnpm seed
pnpm dev                      # API en :3000 y PWA en :5173
```

Puertos que deben estar libres: **3000** (API), **8080** (PWA en contenedor),
**5173** (PWA en desarrollo), **5432** (PostgreSQL) y **11434** (Ollama, si se
usa).

### IA en el servidor

Con clave de Google, en `.env`:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=<clave de Google AI Studio>
```

Sin internet, con Ollama:

```bash
ollama serve
ollama pull qwen2.5:3b
ollama pull llava:7b
```

```
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_VISION_MODEL=llava:7b
```

Comprobar antes de empezar: `GET http://localhost:3000/api/ai/status` debe
responder `"available": true`. El asistente tambien lo muestra en su cabecera.

### Usuarios de demostracion

Todos con la contrasena `password123`. La pantalla de inicio de sesion trae un
boton por usuario para entrar de un clic.

| Correo              | Rol en los proyectos semilla |
| ------------------- | ---------------------------- |
| `admin@admin.com`   | Propietario                  |
| `demo@umlforge.dev` | Editor                       |
| `user@user.com`     | Lector                       |

Cuatro proyectos cargados: clinica veterinaria, comercio electronico, gestion
academica con herencia e inscripciones N:M.

## 4. Guion por escenario

### 1. Tres usuarios en tiempo real

Abre tres navegadores (o ventanas de incognito) con `admin`, `demo` y `user`
sobre el mismo proyecto. Se ven los avatares en la barra inferior, el contador
de conectados y el cursor de cada uno con su nombre y color sobre el diagrama.
Cualquier cambio aparece al instante en los demas.

### 2. Dictado por voz

En el editor, boton **Asistente IA**, o pantalla completa en
`/projects/<id>/assistant`. Pulsa **Dictar** y di la frase del enunciado. La IA
responde con una propuesta; se revisa y se pulsa **Aplicar**.

### 3. Foto de un diagrama en papel

En el mismo panel, boton **Imagen**: PNG, JPEG o WebP hasta 5 MB. Misma
revision antes de aplicar.

### 4. Trabajo sin conexion

Corta la red desde las herramientas del navegador, sigue editando (el indicador
pasa a "Sin conexion" con los cambios pendientes), reconecta y comprueba que
todo se fusiona sin perder ni duplicar.

### 5. Interoperabilidad XMI

**Exportar**: boton _Exportar XMI_ del editor, y abrir el fichero en Enterprise
Architect con _Import Package from XMI_.

**Importar**: exportar desde Enterprise Architect en formato **XMI 2.1** (no
1.1 ni el formato nativo) y subirlo con _Importar XMI_. Se avisa antes de
reemplazar el modelo.

### 6. Generar el backend

Boton **Generar backend**: grupo, artefacto, paquete, base de datos y puerto.
Se descarga el ZIP. Para ensenarlo compilando:

```bash
unzip <artefacto>.zip && cd <artefacto>
mvn -q compile
mvn spring-boot:run
```

Antes de arrancarlo hay que crear su base de datos (ver el apartado 6).

## 5. Trampas conocidas

- Entra siempre por **`http://localhost:5173`**, nunca por `127.0.0.1`: la
  cookie de refresco y el CORS son para `localhost`.
- El **dictado necesita internet** aunque la IA sea local: Chrome hace el
  reconocimiento de voz en sus servidores.
- El microfono solo funciona en contexto seguro. `localhost` vale; desde otra
  maquina por IP de red el navegador lo bloquea.
- **Despues de `pnpm test` hay que ejecutar `pnpm seed`**: las pruebas E2E de la
  API vacian la base de datos y el inicio de sesion dejaria de funcionar.
- Firefox no reconoce voz. Usa Chrome, Edge o Brave.
- Si Ollama esta arrancado pero falta el modelo, el estado sale como no
  disponible y el registro de la API dice que `ollama pull` falta.

## 6. Pendiente antes de la defensa

### Dos fallos abiertos en el backend generado

1. **No trae Swagger.** El `pom.xml` generado no incluye `springdoc-openapi` ni
   los controladores llevan anotaciones, de modo que no hay `/swagger-ui.html`.
   El escenario 6 lo pide de forma explicita.
2. **La conexion a base de datos no encaja con el entorno.** El
   `application.properties` generado apunta a
   `jdbc:postgresql://localhost:5432/<artefacto>` con usuario y contrasena
   `postgres`. Hay que crear esa base y ese usuario antes de arrancarlo, o
   llevar esos tres valores al dialogo de generacion.

### Lo que no se ha podido verificar en el entorno de desarrollo

1. Abrir el XMI exportado en **Enterprise Architect** real, y al reves. La
   exportacion sigue el estandar y hay pruebas contra un fichero realista de la
   herramienta, pero la herramienta no esta disponible aqui.
2. La **calidad de las operaciones** que genere Ollama con un modelo pequeno.
3. El **dictado con microfono** real.
4. **Tres navegadores simultaneos** (las pruebas automaticas cubren dos).
5. El backend generado **arrancando** contra PostgreSQL: se compila, no se
   ejecuta.

## 7. Verificacion antes de salir de casa

```bash
pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm seed            # imprescindible despues de pnpm test
pnpm e2e             # once caminos completos con Chromium
```

Para las pruebas de navegador, la primera vez:

```bash
pnpm --filter @uml-forge/web exec playwright install chromium
```

## 8. Documentacion de apoyo

- `README.md`: puesta en marcha, variables de entorno y estructura.
- `docs/adr/`: treinta decisiones de arquitectura documentadas, utiles si en la
  defensa preguntan por que algo se hizo de una manera y no de otra.
- `http://localhost:3000/api/docs`: Swagger de la API de UML Forge.
