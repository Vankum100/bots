FROM node:18.17.1-alpine
WORKDIR /home/node/monitor-history
RUN chown node:node ./
USER node

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

COPY package.json .
RUN npm install --force
COPY . .
RUN npm run build