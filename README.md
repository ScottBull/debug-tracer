# Debug Tracer

A simple, powerful debug logging utility for Node.js and browsers with file output support. Perfect for development debugging with minimal setup.

## Features

- 🎯 **Namespace-based logging** - Organize logs by feature/module
- 📝 **File output** - Automatically write logs to files for analysis
- 🌐 **Isomorphic** - Works in Node.js and browsers
- 🎚️ **Configurable verbosity** - minimal, detailed, or full output modes
- 🔍 **Request tracking** - Correlate logs across async operations
- 💾 **Zero dependencies** - Lightweight and fast
- 🛠️ **Runtime control** - Enable/disable logging on the fly

## Installation

```bash
npm install debug-tracer
```

## Quick Start

### Node.js

```javascript
const { createDebugger } = require('debug-tracer');

// Create a debugger instance
const debug = createDebugger({
  enabled: true,
  namespaces: ['api', 'database', 'cache']
});

// Create namespace loggers
const apiLog = debug.namespace('api');
const dbLog = debug.namespace('database');

// Use them throughout your code
apiLog('Starting server on port 3000');
dbLog('Connected to PostgreSQL');

// Or use directly
debug.log('cache', 'Cache miss for key:', 'user:123');
```

### Browser

```html
<script src="https://unpkg.com/debug-tracer/browser/index.js"></script>
<script>
  const debug = new DebugTracer({
    enabled: true,
    namespaces: ['ui', 'api', 'state']
  });

  const uiLog = debug.namespace('ui');
  uiLog('Component mounted');
  
  // Logs are automatically saved to localStorage
  // View them with: debug.getLogs()
</script>
```

### ES Modules / TypeScript

```typescript
import { DebugTracer } from 'debug-tracer';

const debug = new DebugTracer({
  enabled: process.env.NODE_ENV === 'development',
  fileOutput: {
    enabled: true,
    path: './logs/debug.log',
    mode: 'detailed'
  }
});

const log = debug.namespace('myapp');
log('Application started');
```

## Environment Variables

Control debugging via environment variables (Node.js):

```bash
# Enable all namespaces
DEBUG=* node app.js

# Enable specific namespaces
DEBUG=api,database node app.js

# Enable with file output
DEBUG=* DEBUG_FILE=true node app.js

# Configure file output
DEBUG_FILE_MODE=minimal DEBUG_FILE_PATH=/tmp/app.log node app.js
```

## Configuration Options

### Node.js Configuration

```javascript
const debug = new DebugTracer({
  enabled: true,              // Enable/disable all logging
  namespaces: ['api', 'db'], // Enable specific namespaces
  fileOutput: {
    enabled: true,            // Write logs to file
    path: '/tmp/debug.log',   // File path
    mode: 'detailed'          // Output mode: minimal, detailed, full
  }
});
```

### File Output Modes

- **minimal**: Only timing and performance data
- **detailed**: Important events and errors (default)
- **full**: Everything including verbose debug info

## API

### Core Methods

```javascript
// Create a namespace logger
const apiLog = debug.namespace('api');
apiLog('Request received', { method: 'GET', path: '/users' });

// Direct logging
debug.log('namespace', 'message', data);

// Enable/disable at runtime
debug.enable('api');        // Enable specific namespace
debug.enable();             // Enable all
debug.disable('verbose');   // Disable specific namespace
debug.disable();            // Disable all

// Check status
console.log(debug.status());

// Request tracking (useful for tracing)
debug.setRequestId('req-123');

// Manual flush (file writer)
debug.flush();
```

### Browser-Specific Methods

```javascript
// Get logs from localStorage
const logs = debug.getLogs();

// Clear stored logs
debug.clearLogs();

// Access via console
window.debugStatus();
window.enableDebug('ui');
window.disableDebug();
```

## Use Cases

### API Server Debugging

```javascript
const debug = createDebugger();
const apiLog = debug.namespace('api');
const dbLog = debug.namespace('database');

app.use((req, res, next) => {
  const requestId = uuid();
  debug.setRequestId(requestId);
  apiLog('Incoming request', { 
    method: req.method, 
    path: req.path 
  });
  next();
});
```

### React Component Debugging

```jsx
import { DebugTracer } from 'debug-tracer';

const debug = new DebugTracer({ 
  enabled: process.env.NODE_ENV === 'development' 
});

function MyComponent() {
  const log = debug.namespace('MyComponent');
  
  useEffect(() => {
    log('Component mounted');
    return () => log('Component unmounted');
  }, []);
  
  return <div>Hello World</div>;
}
```

### Performance Tracking

```javascript
const perfLog = debug.namespace('performance');

async function processData(data) {
  const start = Date.now();
  
  const result = await heavyComputation(data);
  
  perfLog('Processing complete', {
    duration: Date.now() - start,
    inputSize: data.length,
    outputSize: result.length
  });
  
  return result;
}
```

## Analyzing Log Files

### Using the Built-in CLI Tool

Debug Tracer includes a powerful CLI tool for analyzing log files:

```bash
# Analyze log file
npx debug-tracer analyze /tmp/debug.log

# Show only errors
npx debug-tracer errors /tmp/debug.log

# View performance metrics
npx debug-tracer perf /tmp/debug.log

# Filter by namespace
npx debug-tracer filter /tmp/debug.log --namespace api --limit 20

# Show statistics
npx debug-tracer stats /tmp/debug.log

# Tail last 50 entries
npx debug-tracer tail /tmp/debug.log
```

Run `npx debug-tracer help` for all available commands.

### Manual Analysis with jq

Log files are written in JSON Lines format (one JSON object per line):

```bash
# View logs with jq
cat /tmp/debug.log | jq '.namespace == "api"'

# Filter by timestamp
cat /tmp/debug.log | jq 'select(.timestamp > "2024-01-01")'

# Count by namespace
cat /tmp/debug.log | jq -r .namespace | sort | uniq -c
```

## Best Practices

1. **Use meaningful namespaces**: Group related functionality
   ```javascript
   // Good
   auth:login, auth:logout, auth:refresh
   db:query, db:transaction, db:connection
   
   // Less helpful
   function1, function2, misc
   ```

2. **Include context in messages**:
   ```javascript
   // Good
   log('User login failed', { userId, reason: 'invalid password' });
   
   // Less helpful  
   log('Login failed');
   ```

3. **Use request IDs for tracing**:
   ```javascript
   middleware((req, res, next) => {
     debug.setRequestId(req.id);
     next();
   });
   ```

4. **Clean up in production**:
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     debug.disable();
   }
   ```

## Integration with Development Tools

### AI Assistant Configuration (Claude, Copilot, ChatGPT)

When using AI assistants for development, document the debug utility in your project instructions (e.g., `CLAUDE.md`, `.github/copilot-instructions.md`):

```markdown
## Debug System
- **Package**: debug-tracer
- **Frontend logs**: `/tmp/app-frontend-debug.json`
- **Backend logs**: `/tmp/app-backend-debug.json`
- **Enable all**: `DEBUG=* npm run dev`
- **Enable specific**: `DEBUG=api,database npm run dev`
- **Analysis**: View logs with `cat /tmp/app-backend-debug.json | jq`

## Quick Commands
# Enable debug logging for current session
export DEBUG=*

# Enable file output with minimal mode
export DEBUG_FILE=true DEBUG_FILE_MODE=minimal

# Check recent errors
cat /tmp/app-backend-debug.json | jq 'select(.data.error != null)'
```

### IDE Integration

#### VS Code Settings
Add to `.vscode/settings.json`:
```json
{
  "terminal.integrated.env.linux": {
    "DEBUG": "api,database",
    "DEBUG_FILE": "true"
  }
}
```

#### WebStorm/IntelliJ
Add to Run Configuration environment variables:
```
DEBUG=*
DEBUG_FILE=true
DEBUG_FILE_PATH=./debug.log
```

### Docker Configuration

```dockerfile
# Development
ENV DEBUG=*
ENV DEBUG_FILE=true
ENV DEBUG_FILE_PATH=/tmp/app-debug.log

# Production (only errors)
ENV DEBUG=error,critical
ENV DEBUG_FILE_MODE=minimal
```

### CI/CD Integration

#### GitHub Actions
```yaml
- name: Run tests with debug
  env:
    DEBUG: test,api
    DEBUG_FILE: true
  run: npm test
  
- name: Upload debug logs
  if: failure()
  uses: actions/upload-artifact@v2
  with:
    name: debug-logs
    path: /tmp/*-debug.json
```

## Configuration Reference

See [.env.example](./.env.example) for all configuration options with detailed explanations.

### Quick Reference

| Environment Variable | Description | Values |
|---------------------|-------------|---------|
| `DEBUG` | Enable namespaces | `*`, `true`, or comma-separated list |
| `DEBUG_FILE` | Enable file output | `true` or `false` |
| `DEBUG_FILE_MODE` | Output verbosity | `minimal`, `detailed`, `full` |
| `DEBUG_FILE_PATH` | Log file location | Any valid file path |

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

Inspired by the need for better debugging tools in complex applications. Built with simplicity and performance in mind.