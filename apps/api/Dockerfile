# Imagen de la API de UML Forge. El contexto de construccion es la raiz del
# monorepo, porque la API depende de los paquetes compartidos por workspace.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
# --frozen-lockfile: la imagen se construye con las versiones ya resueltas.
RUN pnpm install --frozen-lockfile
# Turbo compila antes los paquetes de los que depende la API.
RUN pnpm exec turbo run build --filter=@uml-forge/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
