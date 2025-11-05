FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm install -g typescript && \
    npm run build && \
    npm uninstall -g typescript

# Create output directory
RUN mkdir -p /output

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
