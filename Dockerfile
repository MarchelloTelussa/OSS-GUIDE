# Use an official, lightweight Node runtime
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests first to leverage Docker caching
COPY package*.json ./

# Install ONLY production dependencies reproducibly
RUN npm ci --only=production

# Copy the rest of your application code
COPY . .

# Expose your app's port (e.g., 3000)
EXPOSE 3000

# Start your web application
CMD ["npm", "start"]