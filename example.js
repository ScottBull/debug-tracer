/**
 * Example usage of debug-tracer
 * Run with: DEBUG=* node example.js
 */

// Since we haven't published to npm yet, we'll require the source directly
const { DebugTracer } = require('./dist/index.js');

// Create a debugger instance
const debug = new DebugTracer({
  enabled: true,
  namespaces: ['app', 'api', 'database'],
  fileOutput: {
    enabled: true,
    path: './debug.log',
    mode: 'detailed'
  }
});

// Create namespace loggers
const appLog = debug.namespace('app');
const apiLog = debug.namespace('api');
const dbLog = debug.namespace('database');

// Simulate an application
async function simulateApp() {
  appLog('Application starting...');
  
  // Simulate database connection
  await simulateDatabase();
  
  // Simulate API requests
  await simulateApiRequests();
  
  appLog('Application completed successfully');
  
  // Show status
  console.log('\nDebug Status:', debug.status());
  
  // Clean up
  debug.flush();
  debug.destroy();
}

async function simulateDatabase() {
  dbLog('Connecting to database...');
  await sleep(100);
  dbLog('Connected to PostgreSQL', { host: 'localhost', port: 5432 });
  
  dbLog('Running migrations...');
  await sleep(50);
  dbLog('Migrations complete', { count: 3 });
}

async function simulateApiRequests() {
  const requests = [
    { method: 'GET', path: '/users', duration: 45 },
    { method: 'POST', path: '/users', duration: 123 },
    { method: 'GET', path: '/posts', duration: 67 }
  ];
  
  for (const req of requests) {
    // Set request ID for tracing
    debug.setRequestId(`req-${Math.random().toString(36).substr(2, 9)}`);
    
    apiLog('Incoming request', { method: req.method, path: req.path });
    await sleep(req.duration);
    apiLog('Request completed', { 
      method: req.method, 
      path: req.path, 
      duration: req.duration,
      status: 200 
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the example
simulateApp().catch(console.error);