# Use an official, lightweight Node runtime
FROM node:20-alpine

# Install ffmpeg (for fluent-ffmpeg) and vips-dev (for sharp on Alpine)
RUN apk add --no-cache ffmpeg vips-dev

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests first to leverage Docker caching
COPY package*.json ./

# Install ONLY production dependencies reproducibly
RUN npm ci --omit=dev

# Copy the rest of your application code
COPY . .

# Expose your app's port
EXPOSE 3000

# Start your web application
CMD ["npm", "start"]