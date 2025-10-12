# SonarQube Integration Guide

## Overview
This document explains how to set up and use SonarQube code quality analysis for the CRM Backend project.

## What is SonarQube?
SonarQube is a continuous inspection tool that analyzes code quality and security vulnerabilities. It provides:
- Code quality metrics
- Security vulnerability detection
- Code smell identification
- Test coverage analysis
- Technical debt tracking

## Installation & Setup

### Option 1: Using SonarCloud (Recommended for Teams)

SonarCloud is the cloud-based version of SonarQube, perfect for GitHub/GitLab projects.

#### Step 1: Sign Up for SonarCloud
1. Go to [https://sonarcloud.io](https://sonarcloud.io)
2. Sign in with your GitHub/GitLab/Bitbucket account
3. Create an organization or join an existing one

#### Step 2: Create a New Project
1. Click "+" → "Analyze new project"
2. Select your repository
3. Note your **Project Key** and **Organization Key**

#### Step 3: Get Your Token
1. Go to "My Account" → "Security"
2. Generate a new token
3. Copy the token (you'll need it for scanning)

#### Step 4: Configure Environment Variables
Create a `.env.sonar` file in the project root:

\`\`\`bash
SONAR_HOST_URL=https://sonarcloud.io
SONAR_TOKEN=your-token-here
SONAR_ORGANIZATION=your-org-name
\`\`\`

#### Step 5: Update sonar-project.properties
Uncomment and update these lines in `sonar-project.properties`:

\`\`\`properties
sonar.organization=your-org-name
sonar.host.url=https://sonarcloud.io
\`\`\`

#### Step 6: Run Scan
\`\`\`bash
npm run sonar:cloud
\`\`\`

### Option 2: Using Local SonarQube Server

#### Step 1: Install SonarQube Server
Using Docker (easiest):

\`\`\`bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:latest
\`\`\`

Or download from [https://www.sonarqube.org/downloads/](https://www.sonarqube.org/downloads/)

#### Step 2: Access SonarQube
1. Open http://localhost:9000
2. Default login: admin/admin
3. Change password when prompted

#### Step 3: Create Project
1. Click "Create new project" → "Manually"
2. Enter project key: `crm-backend`
3. Enter display name: `CRM Backend (Node.js/TypeScript)`
4. Click "Set Up"

#### Step 4: Generate Token
1. Choose "Locally"
2. Generate a token
3. Copy the token

#### Step 5: Configure Environment
Create `.env.sonar`:

\`\`\`bash
SONAR_HOST_URL=http://localhost:9000
SONAR_TOKEN=your-token-here
\`\`\`

#### Step 6: Run Scan
\`\`\`bash
npm run sonar
\`\`\`

## VS Code Integration with SonarLint

### Install SonarLint Extension
1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "SonarLint"
4. Install the extension by SonarSource

### Connect to SonarQube/SonarCloud (Optional)
1. Open Command Palette (Cmd+Shift+P)
2. Type "SonarLint: Add SonarQube Connection"
3. Choose SonarQube or SonarCloud
4. Enter server URL and token
5. Bind your workspace to the project

### Features
- **Real-time code analysis**: Issues highlighted as you type
- **Quick fixes**: Automatic fixes for common issues
- **Rule explanations**: Detailed explanations for each rule
- **Security hotspots**: Identify security vulnerabilities

## Available npm Scripts

\`\`\`bash
# Run SonarQube scan (local server)
npm run sonar

# Run SonarQube scan (SonarCloud)
npm run sonar:cloud

# Generate test coverage before scanning
npm run test:coverage

# Run tests with coverage, then scan
npm run test:coverage && npm run sonar
\`\`\`

## Understanding SonarQube Metrics

### Code Quality Metrics
- **Bugs**: Code that is demonstrably wrong
- **Vulnerabilities**: Security issues
- **Code Smells**: Maintainability issues
- **Coverage**: Test coverage percentage
- **Duplications**: Duplicated code blocks

### Quality Gates
Quality gates are predefined thresholds that your code must meet:
- Coverage > 80%
- Duplications < 3%
- Maintainability Rating: A
- Reliability Rating: A
- Security Rating: A

## Configuration Files

### sonar-project.properties
Main configuration file for SonarQube scanner.

### sonar-scan.js
Node.js script that runs the scanner programmatically.

### .vscode/settings.json
VS Code workspace settings for SonarLint integration.

## Best Practices

1. **Run scans regularly**: Before commits, in CI/CD pipelines
2. **Fix critical issues first**: Focus on bugs and vulnerabilities
3. **Monitor trends**: Track code quality over time
4. **Set quality gates**: Prevent bad code from being merged
5. **Review security hotspots**: Regularly check for security issues

## CI/CD Integration

### GitHub Actions Example
\`\`\`yaml
name: SonarCloud Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  sonarcloud:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: SonarCloud Scan
        env:
          SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
        run: npm run sonar:cloud
\`\`\`

## Troubleshooting

### Common Issues

**Issue**: "SonarQube server not found"
- **Solution**: Check your `SONAR_HOST_URL` in `.env.sonar`

**Issue**: "Authentication failed"
- **Solution**: Verify your `SONAR_TOKEN` is correct

**Issue**: "Project not found"
- **Solution**: Create the project in SonarQube first

**Issue**: "No coverage data found"
- **Solution**: Run `npm run test:coverage` before scanning

## Support & Resources

- SonarQube Documentation: https://docs.sonarqube.org/
- SonarCloud Documentation: https://sonarcloud.io/documentation
- SonarLint Documentation: https://www.sonarlint.org/vscode/
- Community Forum: https://community.sonarsource.com/

## Contact

For questions or issues with this setup, please contact the development team.
