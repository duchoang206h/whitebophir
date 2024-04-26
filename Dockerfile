
# Stage 1: Build stage
FROM node:20-alpine3.17 AS build
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY . .
# Stage 2: Production stage
FROM node:20-alpine3.17 AS production
WORKDIR /opt/app
COPY --from=build /opt/app .
RUN chown -R 1000:1000 /opt/app
ENV PORT=5001
EXPOSE 5001
VOLUME /opt/app/server-data
USER 1000:1000
CMD ["node", "server/server.js"]
