#!/usr/bin/env node

/**
 * Prism Mock Server
 * 
 * Starts a Prism mock server from the OpenAPI specification.
 * This server generates realistic mock responses based on the schema.
 */

const { execSync } = require('child_process');
const path = require('path');

const specPath = path.join(__dirname, '..', 'ddi-rest.yaml');
const port = process.env.PORT || 4010;

console.log('🚀 Starting Prism Mock Server...');
console.log(`📄 OpenAPI Spec: ${specPath}`);
console.log(`🌐 Server will run on: http://localhost:${port}`);
console.log('');

try {
  execSync(`npx prism mock "${specPath}" --port ${port} --dynamic`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  console.error('❌ Error starting mock server:', error.message);
  process.exit(1);
}

