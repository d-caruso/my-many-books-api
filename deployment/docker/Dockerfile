# Multi-stage Docker build for My Many Books API
FROM node:18-alpine AS base
LABEL maintainer="My Many Books API Team"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development

# Install all dependencies (including dev dependencies)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create development user and set permissions
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "dev"]

# Production dependencies stage
FROM base AS deps
ENV NODE_ENV=production

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Production build stage
FROM base AS build
ENV NODE_ENV=production

# Install all dependencies for building
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    tini \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy configuration files
COPY --from=build --chown=nodejs:nodejs /app/config ./config
COPY --from=build --chown=nodejs:nodejs /app/database ./database
COPY --from=build --chown=nodejs:nodejs /app/serverless.yml ./

# Set user permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/handlers/index.js"]

# Lambda stage (for AWS Lambda deployment)
FROM public.ecr.aws/lambda/nodejs:18 AS lambda

# Copy built application
COPY --from=build ${LAMBDA_TASK_ROOT}/dist ${LAMBDA_TASK_ROOT}/dist
COPY --from=build ${LAMBDA_TASK_ROOT}/package*.json ${LAMBDA_TASK_ROOT}/

# Copy production dependencies
COPY --from=deps ${LAMBDA_TASK_ROOT}/node_modules ${LAMBDA_TASK_ROOT}/node_modules

# Copy configuration files
COPY --from=build ${LAMBDA_TASK_ROOT}/config ${LAMBDA_TASK_ROOT}/config
COPY --from=build ${LAMBDA_TASK_ROOT}/database ${LAMBDA_TASK_ROOT}/database

# Set Lambda handler
CMD ["dist/handlers/router.handler"]

# Development with hot reload
FROM base AS dev-hot
ENV NODE_ENV=development

# Install all dependencies
RUN npm ci

# Install development tools
RUN npm install -g nodemon ts-node

# Copy source code
COPY . .

# Set user
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "dev"]

# Testing stage
FROM base AS test
ENV NODE_ENV=test

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Set user
USER nodejs

# Run tests
CMD ["npm", "test"]