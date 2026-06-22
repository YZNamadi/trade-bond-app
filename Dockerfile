FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=/api
ARG VITE_ADMIN_API_TOKEN=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ADMIN_API_TOKEN=$VITE_ADMIN_API_TOKEN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY deploy/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/client /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
