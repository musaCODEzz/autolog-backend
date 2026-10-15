import fs from 'fs';
import path from 'path';
import { swaggerSpec } from '../config/swagger';

const publicDir = path.join(__dirname, '../../public');
const openapiJsonPath = path.join(publicDir, 'openapi.json');
const docsHtmlPath = path.join(publicDir, 'docs.html');
const apiDocsDir = path.join(publicDir, 'api-docs');
const apiDocsIndexPath = path.join(apiDocsDir, 'index.html');

// Ensure output directories exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Write openapi.json
fs.writeFileSync(openapiJsonPath, JSON.stringify(swaggerSpec, null, 2), 'utf-8');
console.log(`✓ Generated ${openapiJsonPath} (${(fs.statSync(openapiJsonPath).size / 1024).toFixed(1)} KB)`);

// 2. Build interactive docs.html
const docsHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AutoLog Kenya — REST API Documentation (OpenAPI 3.0)</title>
  <meta name="description" content="Official API Documentation for AutoLog Kenya — Digital vehicle passport, maintenance audit, tamper-proof logs, and vehicle handover." />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23050b14'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-weight='900' font-size='42' fill='%2310b981'>AL</text></svg>">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    :root {
      --brand-green: #10b981;
      --brand-dark: #050b14;
      --brand-card: #0c1424;
      --brand-border: rgba(255, 255, 255, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background-color: #0b1120;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .topbar-nav {
      background: var(--brand-dark);
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--brand-border);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-badge {
      background: var(--brand-green);
      color: #04100c;
      font-weight: 900;
      padding: 4px 9px;
      border-radius: 6px;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
    }
    .brand-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.2px;
    }
    .brand-title span {
      color: var(--brand-green);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nav-links a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: color 0.15s ease;
    }
    .nav-links a:hover {
      color: var(--brand-green);
    }
    .nav-links a.btn-back {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--brand-border);
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 600;
    }
    .nav-links a.btn-back:hover {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.35);
      color: var(--brand-green);
    }
    /* Swagger container card */
    #swagger-ui {
      max-width: 1280px;
      margin: 24px auto 60px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.45);
      overflow: hidden;
    }
    .swagger-ui .topbar {
      display: none !important;
    }
    .swagger-ui .info {
      margin: 30px 0 20px 0 !important;
    }
    .swagger-ui .info .title {
      color: #0f172a !important;
      font-size: 2rem !important;
    }
    .swagger-ui .scheme-container {
      background: #f8fafc !important;
      box-shadow: none !important;
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 30px !important;
    }
  </style>
</head>
<body>
  <header class="topbar-nav">
    <div class="brand-group">
      <div class="brand-badge">AL</div>
      <div class="brand-title">AutoLog <span>KE</span> API Reference</div>
    </div>
    <div class="nav-links">
      <a href="./openapi.json" target="_blank" download="autolog-openapi.json">⬇ Raw OpenAPI Spec</a>
      <a href="./" class="btn-back">← Back to Early Access</a>
    </div>
  </header>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    const EMBEDDED_SPEC = ${JSON.stringify(swaggerSpec)};

    window.onload = function() {
      // Use embedded spec directly for 100% offline & GitHub Pages reliability
      window.ui = SwaggerUIBundle({
        spec: EMBEDDED_SPEC,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'list'
      });
    };
  </script>
</body>
</html>
`;

fs.writeFileSync(docsHtmlPath, docsHtmlContent, 'utf-8');
console.log(`✓ Generated ${docsHtmlPath}`);

// 3. Also create public/api-docs/index.html to handle any direct /api-docs/ navigation
if (!fs.existsSync(apiDocsDir)) {
  fs.mkdirSync(apiDocsDir, { recursive: true });
}
const apiDocsRedirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to API Documentation...</title>
  <meta http-equiv="refresh" content="0; url=../docs.html">
  <script>window.location.replace('../docs.html');</script>
</head>
<body>
  <p>Redirecting to <a href="../docs.html">AutoLog API Documentation</a>...</p>
</body>
</html>`;
fs.writeFileSync(apiDocsIndexPath, apiDocsRedirectHtml, 'utf-8');
console.log(`✓ Generated ${apiDocsIndexPath}`);
