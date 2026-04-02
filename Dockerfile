# -------- BUILD STAGE --------
FROM ghcr.io/cirruslabs/flutter:stable AS build

WORKDIR /app
ARG API_BASE_URL=http://72.60.28.22:3002/api

COPY . .

RUN flutter config --enable-web
RUN flutter pub get
RUN flutter build web --release --dart-define=API_BASE_URL=$API_BASE_URL

# -------- SERVE STAGE --------
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/build/web /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
