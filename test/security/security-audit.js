const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityAudit {
  constructor() {
    this.results = {
      vulnerabilities: [],
      dependencies: [],
      codeIssues: [],
      recommendations: [],
    };
  }

  async runFullAudit() {
    console.log('🔒 Starting Security Audit...');
    
    await this.auditDependencies();
    await this.auditCodeSecurity();
    await this.auditSecrets();
    await this.auditConfiguration();
    await this.generateReport();
    
    console.log('✅ Security Audit completed!');
  }

  async auditDependencies() {
    console.log('📦 Auditing dependencies...');
    
    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditData = JSON.parse(auditOutput);
      
      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([name, vuln]) => {
          this.results.vulnerabilities.push({
            type: 'dependency',
            name,
            severity: vuln.severity,
            description: vuln.description,
            recommendation: vuln.recommendation,
          });
        });
      }
    } catch (error) {
      console.log('⚠️ npm audit failed:', error.message);
    }

    // Check for outdated packages
    try {
      const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf8' });
      const outdatedData = JSON.parse(outdatedOutput);
      
      Object.entries(outdatedData).forEach(([name, info]) => {
        this.results.dependencies.push({
          name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          type: 'outdated',
        });
      });
    } catch (error) {
      // No outdated packages
    }
  }

  async auditCodeSecurity() {
    console.log('🔍 Auditing code security...');
    
    const securityPatterns = [
      {
        pattern: /eval\s*\(/g,
        severity: 'high',
        description: 'Use of eval() function detected',
        recommendation: 'Avoid using eval() as it can lead to code injection vulnerabilities',
      },
      {
        pattern: /innerHTML\s*=/g,
        severity: 'medium',
        description: 'Direct innerHTML assignment detected',
        recommendation: 'Use textContent or sanitize HTML to prevent XSS',
      },
      {
        pattern: /document\.write\s*\(/g,
        severity: 'medium',
        description: 'Use of document.write() detected',
        recommendation: 'Avoid document.write() as it can lead to XSS vulnerabilities',
      },
      {
        pattern: /localStorage\.setItem\s*\([^,]+,\s*[^)]*\+/g,
        severity: 'medium',
        description: 'String concatenation in localStorage detected',
        recommendation: 'Sanitize data before storing in localStorage',
      },
      {
        pattern: /process\.env\.\w+/g,
        severity: 'low',
        description: 'Environment variable usage detected',
        recommendation: 'Ensure environment variables are properly secured',
      },
    ];

    const sourceFiles = this.getSourceFiles();
    
    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      securityPatterns.forEach(pattern => {
        const matches = content.match(pattern.pattern);
        if (matches) {
          this.results.codeIssues.push({
            file,
            pattern: pattern.pattern.source,
            severity: pattern.severity,
            description: pattern.description,
            recommendation: pattern.recommendation,
            matches: matches.length,
          });
        }
      });
    });
  }

  async auditSecrets() {
    console.log('🔐 Auditing for secrets...');
    
    const secretPatterns = [
      {
        pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
        description: 'Hardcoded password detected',
        severity: 'high',
      },
      {
        pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
        description: 'API key detected',
        severity: 'high',
      },
      {
        pattern: /(?:secret|token)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
        description: 'Secret or token detected',
        severity: 'high',
      },
      {
        pattern: /(?:private[_-]?key|privatekey)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
        description: 'Private key detected',
        severity: 'critical',
      },
      {
        pattern: /(?:database[_-]?url|db[_-]?url)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
        description: 'Database URL detected',
        severity: 'medium',
      },
    ];

    const sourceFiles = this.getSourceFiles();
    
    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      secretPatterns.forEach(pattern => {
        const matches = content.match(pattern.pattern);
        if (matches) {
          this.results.codeIssues.push({
            file,
            pattern: pattern.pattern.source,
            severity: pattern.severity,
            description: pattern.description,
            recommendation: 'Remove hardcoded secrets and use environment variables',
            matches: matches.length,
          });
        }
      });
    });
  }

  async auditConfiguration() {
    console.log('⚙️ Auditing configuration...');
    
    const configFiles = [
      'package.json',
      'docker-compose.yml',
      'Dockerfile',
      '.env.example',
      'nginx.conf',
    ];

    configFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for insecure configurations
        if (content.includes('NODE_ENV=development') && file === 'docker-compose.yml') {
          this.results.recommendations.push({
            file,
            issue: 'Development environment in production',
            recommendation: 'Use NODE_ENV=production in production deployments',
          });
        }
        
        if (content.includes('debug: true') && file === 'package.json') {
          this.results.recommendations.push({
            file,
            issue: 'Debug mode enabled',
            recommendation: 'Disable debug mode in production',
          });
        }
      }
    });
  }

  getSourceFiles() {
    const sourceDir = path.join(__dirname, '../../src');
    const files = [];
    
    function walkDir(dir) {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.js')) {
          files.push(fullPath);
        }
      });
    }
    
    walkDir(sourceDir);
    return files;
  }

  async generateReport() {
    console.log('📊 Generating security report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalVulnerabilities: this.results.vulnerabilities.length,
        totalDependencies: this.results.dependencies.length,
        totalCodeIssues: this.results.codeIssues.length,
        totalRecommendations: this.results.recommendations.length,
      },
      results: this.results,
    };

    // Save JSON report
    const outputDir = path.join(__dirname, 'results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(outputDir, 'security-audit.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    fs.writeFileSync(
      path.join(outputDir, 'security-audit.html'),
      htmlReport
    );

    console.log('📄 Security report saved to test/security/results/');
  }

  generateHtmlReport(report) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Security Audit Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .metric { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .success { background-color: #d4edda; border-color: #c3e6cb; }
            .warning { background-color: #fff3cd; border-color: #ffeaa7; }
            .error { background-color: #f8d7da; border-color: #f5c6cb; }
            .critical { background-color: #f8d7da; border-color: #f5c6cb; }
            .header { background-color: #dc3545; color: white; padding: 20px; border-radius: 5px; }
            .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .metric-value { font-size: 1.5em; font-weight: bold; color: #dc3545; }
            .metric-label { color: #666; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔒 AyazLogistics Security Audit Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="metric-grid">
            <div class="metric ${report.summary.totalVulnerabilities === 0 ? 'success' : 'error'}">
              <div class="metric-label">Vulnerabilities</div>
              <div class="metric-value">${report.summary.totalVulnerabilities}</div>
              <p>Security vulnerabilities found</p>
            </div>
            
            <div class="metric ${report.summary.totalDependencies === 0 ? 'success' : 'warning'}">
              <div class="metric-label">Outdated Dependencies</div>
              <div class="metric-value">${report.summary.totalDependencies}</div>
              <p>Packages that need updates</p>
            </div>
            
            <div class="metric ${report.summary.totalCodeIssues === 0 ? 'success' : 'error'}">
              <div class="metric-label">Code Issues</div>
              <div class="metric-value">${report.summary.totalCodeIssues}</div>
              <p>Security issues in code</p>
            </div>
            
            <div class="metric ${report.summary.totalRecommendations === 0 ? 'success' : 'warning'}">
              <div class="metric-label">Recommendations</div>
              <div class="metric-value">${report.summary.totalRecommendations}</div>
              <p>Security recommendations</p>
            </div>
          </div>
          
          ${report.results.vulnerabilities.length > 0 ? `
            <h2>🚨 Vulnerabilities</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                ${report.results.vulnerabilities.map(vuln => `
                  <tr>
                    <td>${vuln.name}</td>
                    <td class="${vuln.severity}">${vuln.severity.toUpperCase()}</td>
                    <td>${vuln.description}</td>
                    <td>${vuln.recommendation}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${report.results.codeIssues.length > 0 ? `
            <h2>🔍 Code Security Issues</h2>
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                ${report.results.codeIssues.map(issue => `
                  <tr>
                    <td>${issue.file}</td>
                    <td class="${issue.severity}">${issue.severity.toUpperCase()}</td>
                    <td>${issue.description}</td>
                    <td>${issue.recommendation}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${report.results.recommendations.length > 0 ? `
            <h2>💡 Security Recommendations</h2>
            <ul>
              ${report.results.recommendations.map(rec => `
                <li><strong>${rec.file}:</strong> ${rec.issue} - ${rec.recommendation}</li>
              `).join('')}
            </ul>
          ` : ''}
        </body>
      </html>
    `;
  }
}

if (require.main === module) {
  const audit = new SecurityAudit();
  audit.runFullAudit().catch(console.error);
}

module.exports = SecurityAudit;
