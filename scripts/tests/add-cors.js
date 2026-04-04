const fs = require('fs');

// Read the current server file
let serverContent = fs.readFileSync('src/server.ts', 'utf8');

// Add CORS import if not present
if (!serverContent.includes("import cors from 'cors'")) {
    serverContent = serverContent.replace(
        "import express from 'express';",
        "import express from 'express';\nimport cors from 'cors';"
    );
}

// Add CORS middleware right after app creation
if (!serverContent.includes('app.use(cors(')) {
    // Find where middlewares are added
    const middlewareRegex = /(app\.use\(express\.json\(\)\);)/;
    
    if (middlewareRegex.test(serverContent)) {
        serverContent = serverContent.replace(
            middlewareRegex,
            `// CORS Configuration
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:5500', 'file://'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

$1`
        );
    } else {
        // If express.json() isn't found, add CORS after app creation
        serverContent = serverContent.replace(
            'const app = express();',
            `const app = express();

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:5500', 'file://'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));`
        );
    }
}

// Write the updated content back
fs.writeFileSync('src/server.ts', serverContent);
console.log('✅ CORS configuration added to server!');
