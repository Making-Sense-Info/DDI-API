#!/usr/bin/env node

/**
 * Build Swagger UI HTML file
 * 
 * Copies Swagger UI files and creates an HTML file that loads the OpenAPI specification.
 */

const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, '..', 'ddi-rest.yaml');
const outputPath = path.join(__dirname, '..', 'dist', 'index.html');
const distDir = path.dirname(outputPath);
const swaggerUiPath = path.join(__dirname, '..', 'node_modules', 'swagger-ui', 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Check if swagger-ui is installed
if (!fs.existsSync(swaggerUiPath)) {
  console.error('❌ Error: swagger-ui not found. Please run: npm install');
  process.exit(1);
}

// Copy YAML file to dist
const distSpecPath = path.join(distDir, 'ddi-rest.yaml');
fs.copyFileSync(specPath, distSpecPath);
console.log('📄 Copied ddi-rest.yaml');

// Copy Swagger UI files to dist
const swaggerUiFiles = [
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
  'swagger-ui.css'
];

swaggerUiFiles.forEach(file => {
  const src = path.join(swaggerUiPath, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`📄 Copied ${file}`);
  } else {
    console.warn(`⚠️  Warning: ${file} not found at ${src}`);
  }
});

// Create HTML file
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DDI RESTful API Documentation</title>
  <link rel="stylesheet" type="text/css" href="./swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="./swagger-ui-bundle.js"></script>
  <script src="./swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "./ddi-rest.yaml",
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true
      });
    };
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`✅ Swagger UI built successfully: ${outputPath}`);

