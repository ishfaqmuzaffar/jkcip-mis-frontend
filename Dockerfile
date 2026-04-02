# -------- BUILD STAGE --------
FROM ghcr.io/cirruslabs/flutter:stable AS build

WORKDIR /app

# Copy all files
COPY . .

# Enable web
RUN flutter config --enable-web

# Get dependencies
RUN flutter pub get

# Build web
RUN flutter build web --release

# -------- SERVE STAGE --------
FROM nginx:alpine

# Remove default nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy built app
COPY --from=build /app/build/web /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]