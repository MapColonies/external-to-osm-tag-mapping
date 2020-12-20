FROM node:12.18.3 as build
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:12.18.3 as production
RUN groupadd -r app && useradd -r -g app app
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV SERVER_PORT=8080
WORKDIR /usr/app

COPY ./package*.json ./
RUN npm install --only=production
COPY ./docs ./docs
COPY --from=build /usr/src/app/dist .

CMD ["node index.js"]
