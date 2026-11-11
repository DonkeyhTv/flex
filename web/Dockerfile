FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# One build per language: dist/web/browser/{fr,nl,en}
RUN npx ng build

FROM nginx:1.29-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/headers.conf /etc/nginx/headers.conf
COPY --from=build /app/dist/web/browser /usr/share/nginx/html
