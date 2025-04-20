FROM node:18-alpine

WORKDIR /app

# Install git for project operations
RUN apk add --no-cache git

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create workspaces directory
RUN mkdir -p /app/workspaces

# Expose API port
EXPOSE 3000
# Expose metrics port
EXPOSE 9091

CMD ["npm", "start"]
