const fs = require('fs');

let content = fs.readFileSync('src/server.ts', 'utf8');

if (!content.includes("import cors from 'cors'")) {
    content = content.replace(
        "import express from 'express';",
        "import express from 'express';\nimport cors from 'cors';"
    );
}

if (!content.includes('app.use(cors(')) {
    const corsConfig = `
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5500', 'file://', 'null'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
`;
    content = content.replace('const app = express();', 'const app = express();' + corsConfig);
}

fs.writeFileSync('src/server.ts', content);
console.log('✅ CORS added!');
