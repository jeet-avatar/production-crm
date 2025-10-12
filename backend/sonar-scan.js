const scanner = require('sonarqube-scanner');

scanner(
  {
    serverUrl: process.env.SONAR_HOST_URL || 'http://localhost:9000',
    token: process.env.SONAR_TOKEN || '',
    options: {
      'sonar.projectKey': 'crm-backend',
      'sonar.projectName': 'CRM Backend (Node.js/TypeScript)',
      'sonar.projectVersion': '1.0.0',
      'sonar.sources': 'src',
      'sonar.tests': 'src/__tests__',
      'sonar.exclusions': '**/node_modules/**,**/dist/**,**/build/**,**/*.spec.ts,**/*.test.ts,**/coverage/**,**/prisma/migrations/**',
      'sonar.test.inclusions': '**/*.spec.ts,**/*.test.ts',
      'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
      'sonar.sourceEncoding': 'UTF-8',
    },
  },
  () => {
    console.log('✅ SonarQube scan completed for CRM Backend');
    process.exit();
  },
  (error) => {
    console.error('❌ SonarQube scan failed:', error);
    process.exit(1);
  }
);
