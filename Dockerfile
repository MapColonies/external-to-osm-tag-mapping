FROM node:12.18.3-slim as node-base
RUN apt-get update && apt-get -y install wget

FROM node:12.18.3 as build
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node-base as production
RUN groupadd -r app && useradd -r -g app app
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV SERVER_PORT=8080
WORKDIR /usr/app

COPY ./package*.json ./
RUN npm install --only=production
COPY ./docs ./docs
COPY --from=build /usr/src/app/dist .

RUN chown -R app . && mkdir -p /home/app/.config && chown -R app:app /home/app
USER app:app

HEALTHCHECK CMD wget http://127.0.0.1:${SERVER_PORT}/liveness -O /dev/null || exit 1

CMD ["npm run start"]
