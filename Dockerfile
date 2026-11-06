FROM node:25.3.0 as build-api-stage

WORKDIR /app
COPY package*.json /app/
RUN npm install -g npm@11.7.0
RUN npm ci 
COPY . /app/
# Increase Node memory limit for production build
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Disable Nx daemon in Docker builds
ENV NX_DAEMON=false
RUN npx nx run api:build:production

RUN curl -sf https://gobinaries.com/tj/node-prune | sh
RUN npm prune --production
RUN node-prune


FROM node:25.3.0 as build-web-base

WORKDIR /app
COPY package*.json /app/
RUN npm install -g npm@11.7.0
RUN npm ci
COPY ./ /app/
# packages/immunization-forecast is a git submodule. A checkout without it
# fails much later, inside the test and build steps, as an unresolved import;
# say what is missing here instead.
RUN test -f packages/immunization-forecast/src/index.ts || \
  (echo "packages/immunization-forecast is missing: run 'git submodule update --init --recursive' (or check out with submodules: recursive) before building." >&2; exit 1)
COPY ./nginx.conf /nginx.conf


FROM node:25.3.0 as build-web-stage

ARG IS_DEMO=disabled
ENV IS_DEMO=${IS_DEMO}

COPY --from=build-web-base . .
WORKDIR /app
# Increase Node memory limit for production build
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Disable Nx daemon in Docker builds
ENV NX_DAEMON=false
RUN npx nx test web --configuration=ci
# RUN npx nx run web-e2e:e2e --configuration=ci
RUN npx nx run web:build:production --verbose


# Package React App and API together
FROM node:25.3.0-alpine

ARG MERE_APP_VERSION=unknown
ENV MERE_APP_VERSION=${MERE_APP_VERSION}

WORKDIR /app

COPY --from=build-web-stage /app/dist/apps/web/ /app/web/
COPY --from=build-api-stage /app/dist/apps/api/ /app/api/
COPY --from=build-api-stage /app/node_modules/ /app/node_modules/
COPY ./healthcheck.js /app/healthcheck.js

ENV NODE_ENV production

CMD ["node", "api/main.js"]
