const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

async function runLighthouse(url, options = {}) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  options.port = chrome.port;
  
  const runnerResult = await lighthouse(url, options);
  await chrome.kill();
  
  return runnerResult;
}

async function benchmarkPerformance() {
  const urls = [
    'http://localhost:3000',
    'http://localhost:3000/admin',
    'http://localhost:3000/mobile',
    'http://localhost:3000/api/v1/health',
  ];
  
  const results = {};
  
  for (const url of urls) {
    console.log(`Benchmarking ${url}...`);
    
    const result = await runLighthouse(url, {
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    
    results[url] = {
      performance: result.lhr.categories.performance.score,
      accessibility: result.lhr.categories.accessibility.score,
      'best-practices': result.lhr.categories['best-practices'].score,
      seo: result.lhr.categories.seo.score,
      metrics: {
        'first-contentful-paint': result.lhr.audits['first-contentful-paint'].numericValue,
        'largest-contentful-paint': result.lhr.audits['largest-contentful-paint'].numericValue,
        'cumulative-layout-shift': result.lhr.audits['cumulative-layout-shift'].numericValue,
        'total-blocking-time': result.lhr.audits['total-blocking-time'].numericValue,
        'speed-index': result.lhr.audits['speed-index'].numericValue,
      },
    };
  }
  
  // Save results
  const outputDir = path.join(__dirname, 'results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'benchmark-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(results);
  fs.writeFileSync(
    path.join(outputDir, 'benchmark-report.html'),
    htmlReport
  );
  
  console.log('Benchmark completed! Results saved to test/performance/results/');
  
  return results;
}

function generateHtmlReport(results) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Performance Benchmark Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .success { background-color: #d4edda; border-color: #c3e6cb; }
          .warning { background-color: #fff3cd; border-color: #ffeaa7; }
          .error { background-color: #f8d7da; border-color: #f5c6cb; }
          .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px; }
          .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
          .metric-value { font-size: 1.5em; font-weight: bold; color: #007bff; }
          .metric-label { color: #666; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 AyazLogistics Performance Benchmark Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="metric-grid">
          ${Object.entries(results).map(([url, data]) => `
            <div class="metric">
              <h3>${url}</h3>
              <div class="metric-value">Performance: ${(data.performance * 100).toFixed(1)}%</div>
              <div class="metric-value">Accessibility: ${(data.accessibility * 100).toFixed(1)}%</div>
              <div class="metric-value">Best Practices: ${(data['best-practices'] * 100).toFixed(1)}%</div>
              <div class="metric-value">SEO: ${(data.seo * 100).toFixed(1)}%</div>
            </div>
          `).join('')}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Performance</th>
              <th>Accessibility</th>
              <th>Best Practices</th>
              <th>SEO</th>
              <th>FCP (ms)</th>
              <th>LCP (ms)</th>
              <th>CLS</th>
              <th>TBT (ms)</th>
              <th>SI (ms)</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(results).map(([url, data]) => `
              <tr>
                <td>${url}</td>
                <td class="${data.performance >= 0.9 ? 'success' : data.performance >= 0.7 ? 'warning' : 'error'}">${(data.performance * 100).toFixed(1)}%</td>
                <td class="${data.accessibility >= 0.9 ? 'success' : data.accessibility >= 0.7 ? 'warning' : 'error'}">${(data.accessibility * 100).toFixed(1)}%</td>
                <td class="${data['best-practices'] >= 0.9 ? 'success' : data['best-practices'] >= 0.7 ? 'warning' : 'error'}">${(data['best-practices'] * 100).toFixed(1)}%</td>
                <td class="${data.seo >= 0.9 ? 'success' : data.seo >= 0.7 ? 'warning' : 'error'}">${(data.seo * 100).toFixed(1)}%</td>
                <td>${Math.round(data.metrics['first-contentful-paint'])}</td>
                <td>${Math.round(data.metrics['largest-contentful-paint'])}</td>
                <td>${data.metrics['cumulative-layout-shift'].toFixed(3)}</td>
                <td>${Math.round(data.metrics['total-blocking-time'])}</td>
                <td>${Math.round(data.metrics['speed-index'])}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

if (require.main === module) {
  benchmarkPerformance().catch(console.error);
}

module.exports = { benchmarkPerformance };
