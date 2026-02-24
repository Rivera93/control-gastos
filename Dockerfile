FROM node:20-alpine
WORKDIR /app
RUN npm install -g live-server
EXPOSE 8080