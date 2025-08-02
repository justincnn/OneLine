# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lockb
COPY package.json bun.lock ./

# Install Bun
RUN npm install -g bun

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the app
RUN bun run build

# Expose port 3000
EXPOSE 3000

# Command to run the app
CMD ["bun", "run", "start"]