# Trivy Container Security Setup Guide

**Date**: 2025-10-10
**Trivy Version**: 0.67.2
**Status**: ✅ Installed & Configured

---

## 📋 Table of Contents

1. [What is Trivy?](#what-is-trivy)
2. [Why Trivy Over Grype?](#why-trivy-over-grype)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Current Vulnerabilities](#current-vulnerabilities)
6. [Fix Guide](#fix-guide)
7. [GitHub Actions](#github-actions)
8. [Best Practices](#best-practices)

---

## 🔍 What is Trivy?

**Trivy** is a comprehensive security scanner for:
- ✅ **Container Images** - Scan Docker/OCI images for vulnerabilities
- ✅ **Filesystems** - Scan project dependencies (npm, pip, go mod, etc.)
- ✅ **Infrastructure as Code** - Scan Terraform, CloudFormation, Kubernetes
- ✅ **Secrets** - Detect hardcoded credentials and API keys
- ✅ **Misconfigurations** - Find security misconfigurations in Dockerfiles, K8s
- ✅ **SBOM** - Generate Software Bill of Materials

**Developed by**: Aqua Security
**License**: Apache 2.0 (Open Source)
**GitHub**: https://github.com/aquasecurity/trivy

---

## 🏆 Why Trivy Over Grype?

| Feature | Trivy ✅ | Grype |
|---------|---------|-------|
| **Vulnerability Scanning** | ✅ Excellent | ✅ Excellent |
| **IaC Scanning** | ✅ Yes | ❌ No |
| **Secret Detection** | ✅ Yes | ❌ No |
| **Misconfiguration Detection** | ✅ Yes | ❌ No |
| **License Compliance** | ✅ Yes | ❌ Limited |
| **Container Image Scanning** | ✅ Yes | ✅ Yes |
| **Filesystem Scanning** | ✅ Yes | ✅ Yes |
| **Speed** | ⚡ Fast | ⚡ Fast |
| **CI/CD Integration** | ✅ Easy | ✅ Easy |
| **GitHub Actions** | ✅ Native | ✅ Community |
| **SBOM Generation** | ✅ CycloneDX, SPDX | ✅ Via Syft |

**Winner**: **Trivy** - All-in-one security scanner with more features

---

## 🔧 Installation

### macOS (Homebrew)
```bash
brew install trivy
```

### Verify Installation
```bash
trivy --version
# Output: Version: 0.67.2
```

### Other Platforms
```bash
# Linux (apt)
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# Docker
docker run --rm aquasec/trivy:latest --version
```

---

## 🚀 Usage

### Quick Scan Commands

```bash
# Scan current directory
trivy fs .

# Scan with HIGH and CRITICAL only
trivy fs . --severity HIGH,CRITICAL

# Scan Docker image
trivy image node:18-alpine

# Scan Dockerfile for misconfigurations
trivy config Dockerfile

# Scan for secrets
trivy fs . --scanners secret

# Generate SBOM
trivy fs . --format cyclonedx --output sbom.json
```

### npm Scripts (Project-Specific)

```bash
# Full scan with config file
npm run trivy

# Scan for critical/high vulnerabilities only
npm run trivy:critical

# Scan Docker image
npm run trivy:docker

# Scan configurations
npm run trivy:config

# Scan for secrets
npm run trivy:secret
```

---

## 🚨 Current Vulnerabilities

### Scan Results (2025-10-10)

**Total**: 13 vulnerabilities (1 CRITICAL, 12 HIGH)

| Package | Vulnerability | Severity | Status | Installed | Fixed | Impact |
|---------|--------------|----------|--------|-----------|-------|--------|
| **lodash** | CVE-2019-10744 | 🔴 CRITICAL | fixed | 4.17.11 | 4.17.12 | Prototype pollution |
| **lodash** | CVE-2020-8203 | 🟠 HIGH | fixed | 4.17.11 | 4.17.19 | Prototype pollution |
| **lodash** | CVE-2021-23337 | 🟠 HIGH | fixed | 4.17.11 | 4.17.21 | Command injection |
| **lodash.template** | CVE-2021-23337 | 🟠 HIGH | affected | 4.5.0 | - | Command injection |
| **multer** | CVE-2025-47935 | 🟠 HIGH | fixed | 1.4.5-lts.2 | 2.0.0 | Memory leak DoS |
| **multer** | CVE-2025-47944 | 🟠 HIGH | fixed | 1.4.5-lts.2 | 2.0.0 | Malicious request DoS |
| **multer** | CVE-2025-48997 | 🟠 HIGH | fixed | 1.4.5-lts.2 | 2.0.1 | Unhandled exception |
| **multer** | CVE-2025-7338 | 🟠 HIGH | fixed | 1.4.5-lts.2 | 2.0.2 | DoS |
| **xlsx** | CVE-2023-30533 | 🟠 HIGH | fixed | 0.18.5 | 0.19.3 | Prototype pollution |
| **xlsx** | CVE-2024-22363 | 🟠 HIGH | fixed | 0.18.5 | 0.20.2 | ReDoS |
| **git-parse** | CVE-2021-26543 | 🟠 HIGH | fixed | 1.0.3 | 1.0.5 | Command injection |
| **http-cache-semantics** | CVE-2022-25881 | 🟠 HIGH | fixed | 3.8.1 | 4.1.1 | ReDoS |
| **shelljs** | CVE-2022-0144 | 🟠 HIGH | fixed | 0.7.7 | 0.8.5 | Privilege escalation |

---

## 🔧 Fix Guide

### Priority 1: CRITICAL Vulnerabilities

#### 1. lodash - CVE-2019-10744 (CRITICAL)
**Issue**: Prototype pollution vulnerability

**Fix**:
```bash
npm update lodash@4.17.21
```

**Verification**:
```bash
npm list lodash
# Should show: lodash@4.17.21
```

---

### Priority 2: HIGH Vulnerabilities

#### 2. multer - Multiple DoS Vulnerabilities
**Issue**: 4 HIGH severity DoS vulnerabilities

**Fix**:
```bash
# Update to latest version
npm install multer@latest

# Or specific version
npm install multer@2.0.2
```

**Alternative**: Replace with `@fastify/multipart` if using Fastify

---

#### 3. xlsx - Prototype Pollution & ReDoS
**Issue**: CVE-2023-30533, CVE-2024-22363

**Fix**:
```bash
npm update xlsx@0.20.2
```

**Verification**:
```bash
npm list xlsx
# Should show: xlsx@0.20.2
```

---

#### 4. Other Dependencies

**git-parse**:
```bash
npm update git-parse@1.0.5
```

**http-cache-semantics**:
```bash
npm update http-cache-semantics@4.1.1
```

**shelljs**:
```bash
npm update shelljs@0.8.5
```

---

### Fix All at Once

```bash
# Update all vulnerable packages
npm update lodash@4.17.21 \
  multer@2.0.2 \
  xlsx@0.20.2 \
  git-parse@1.0.5 \
  http-cache-semantics@4.1.1 \
  shelljs@0.8.5

# Run audit
npm audit

# Fix remaining issues
npm audit fix

# Verify no vulnerabilities
trivy fs . --severity CRITICAL,HIGH
```

---

### Breaking Changes to Watch

**multer 1.x → 2.x**:
- API changes in file handling
- Review: https://github.com/expressjs/multer/releases/tag/v2.0.0

**xlsx 0.18 → 0.20**:
- Minor API changes
- Review: https://github.com/SheetJS/sheetjs/releases

**Test after updating**:
```bash
npm run test
npm run build
```

---

## 🤖 GitHub Actions

### Workflow Created
**File**: `.github/workflows/trivy.yml`

### Features:
- ✅ Filesystem vulnerability scanning
- ✅ Docker image scanning
- ✅ Configuration scanning
- ✅ Secret detection
- ✅ SARIF upload to GitHub Security tab
- ✅ Daily scheduled scans
- ✅ Security quality gate (fail on CRITICAL)

### Trigger Workflow:

```bash
# Commit and push
git add .github/workflows/trivy.yml trivy.yaml .trivyignore
git commit -m "feat: Add Trivy container security scanning"
git push origin main
```

### View Results:
1. **GitHub Actions**: Repository → Actions → Trivy Security Scan
2. **Security Tab**: Repository → Security → Code scanning alerts
3. **PR Checks**: Automatic scans on pull requests

---

## 📁 Configuration Files

### trivy.yaml
Main configuration file with scan settings, severity levels, and output formats.

### .trivyignore
Ignore file for suppressing false positives or accepted risks.

**Example**:
```
# Ignore specific CVE with justification
CVE-2021-12345
# Reason: False positive - this package is not used in production
# Ticket: https://github.com/yourorg/yourrepo/issues/123
# Expires: 2025-12-31
```

### package.json Scripts
```json
{
  "scripts": {
    "trivy": "trivy fs . --config trivy.yaml",
    "trivy:critical": "trivy fs . --severity CRITICAL,HIGH",
    "trivy:docker": "trivy image crm-backend:latest",
    "trivy:config": "trivy config .",
    "trivy:secret": "trivy fs . --scanners secret"
  }
}
```

---

## ✅ Best Practices

### 1. Regular Scanning
```bash
# Run before every commit
npm run trivy:critical

# Run full scan weekly
npm run trivy
```

### 2. CI/CD Integration
- ✅ Scan on every PR
- ✅ Fail build on CRITICAL vulnerabilities
- ✅ Weekly scheduled scans
- ✅ Upload results to GitHub Security

### 3. Dependency Updates
```bash
# Check for updates weekly
npm outdated

# Update with caution
npm update

# Scan after updates
npm run trivy:critical
```

### 4. Docker Best Practices
```dockerfile
# Use specific versions, not 'latest'
FROM node:18-alpine

# Use multi-stage builds (already implemented ✅)
FROM node:18-alpine AS builder
# ...
FROM node:18-alpine
# ...

# Run as non-root user (already implemented ✅)
USER nodejs
```

### 5. Secret Prevention
```bash
# Scan for secrets before commit
npm run trivy:secret

# Use git hooks
# Add to .git/hooks/pre-commit:
#!/bin/bash
trivy fs . --scanners secret --exit-code 1
```

### 6. Ignore File Management
- Document WHY each CVE is ignored
- Add expiration dates
- Review quarterly
- Link to tracking issues

---

## 📊 Comparison with Other Tools

### Trivy + SonarQube + Semgrep = Complete Security

| Tool | Purpose | Best For |
|------|---------|----------|
| **Trivy** | Container & dependency security | Vulnerabilities, secrets, IaC |
| **SonarQube** | Code quality & security | Code smells, bugs, SAST |
| **Semgrep** | Pattern-based security | Custom rules, fast SAST |

**Use all three for comprehensive coverage!**

---

## 🆘 Troubleshooting

### Scan is Slow
```bash
# Clear cache
trivy clean --all

# Use local cache
trivy fs . --cache-backend fs
```

### False Positives
Add to `.trivyignore`:
```
CVE-XXXX-XXXXX
# Reason: Package not used in runtime
# Expires: 2025-12-31
```

### Database Update Failed
```bash
# Manual database update
trivy image --download-db-only

# Skip update
trivy fs . --skip-db-update
```

### Image Not Found
```bash
# Build image first
docker build -t crm-backend:latest .

# Then scan
trivy image crm-backend:latest
```

---

## 📈 Metrics & Reporting

### Generate Reports

**JSON**:
```bash
trivy fs . --format json --output trivy-report.json
```

**SARIF** (for GitHub):
```bash
trivy fs . --format sarif --output trivy-results.sarif
```

**CycloneDX SBOM**:
```bash
trivy fs . --format cyclonedx --output sbom.json
```

**SPDX SBOM**:
```bash
trivy fs . --format spdx-json --output sbom.spdx.json
```

### Track Over Time
```bash
# Save results
trivy fs . --format json > results/scan-$(date +%Y%m%d).json

# Compare
diff results/scan-20251001.json results/scan-20251010.json
```

---

## 🔗 Resources

- **Official Docs**: https://trivy.dev/
- **GitHub**: https://github.com/aquasecurity/trivy
- **Vulnerability Database**: https://avd.aquasec.com/
- **Community**: https://slack.aquasec.com/

---

## ✅ Next Steps

1. **Fix Current Vulnerabilities**:
   ```bash
   npm update lodash@4.17.21 multer@2.0.2 xlsx@0.20.2
   npm run trivy:critical
   ```

2. **Commit Configuration**:
   ```bash
   git add .github/workflows/trivy.yml trivy.yaml .trivyignore package.json
   git commit -m "feat: Add Trivy container security scanning"
   ```

3. **Push to GitHub**:
   ```bash
   git push origin main
   ```

4. **Verify GitHub Actions**:
   - Check Actions tab for workflow execution
   - Review Security tab for findings

5. **Set up Alerts**:
   - Enable GitHub security alerts
   - Configure Dependabot

---

**Status**: ✅ **Trivy Installed & Configured**
**Vulnerabilities Found**: 13 (1 CRITICAL, 12 HIGH)
**Next Action**: Fix dependencies and commit configuration

Last Updated: 2025-10-10
