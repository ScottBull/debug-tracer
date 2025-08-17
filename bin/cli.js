#!/usr/bin/env node

/**
 * Debug Tracer CLI
 * Simple command-line tool for analyzing debug logs
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
const command = args[0];
const filePath = args[1];

function printHelp() {
  console.log(`
Debug Tracer CLI - Log Analysis Tool

Usage:
  debug-tracer <command> [options]

Commands:
  analyze <file>     Analyze a debug log file
  filter <file>      Filter logs by namespace or level
  stats <file>       Show statistics about the log file
  tail <file>        Show last 50 log entries
  errors <file>      Show only error logs
  perf <file>        Show performance/timing logs
  help              Show this help message

Examples:
  debug-tracer analyze /tmp/debug.log
  debug-tracer filter /tmp/debug.log --namespace api
  debug-tracer errors /tmp/debug.log
  debug-tracer perf /tmp/debug.log

Options:
  --namespace <ns>   Filter by namespace
  --after <time>     Show logs after timestamp
  --before <time>    Show logs before timestamp
  --limit <n>        Limit number of results
`);
}

async function readLogFile(filePath) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const logs = [];
    for await (const line of rl) {
      if (line.startsWith('{')) {
        try {
          logs.push(JSON.parse(line));
        } catch (e) {
          // Skip non-JSON lines
        }
      }
    }
    return logs;
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
  }
}

async function analyzeCommand(filePath) {
  const logs = await readLogFile(filePath);
  
  console.log('\n📊 Debug Log Analysis');
  console.log('=' .repeat(50));
  console.log(`Total entries: ${logs.length}`);
  
  // Group by namespace
  const namespaces = {};
  logs.forEach(log => {
    namespaces[log.namespace] = (namespaces[log.namespace] || 0) + 1;
  });
  
  console.log('\n📁 Namespaces:');
  Object.entries(namespaces)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ns, count]) => {
      console.log(`  ${ns}: ${count} entries`);
    });
  
  // Find errors
  const errors = logs.filter(log => 
    log.data?.error || 
    log.message?.toLowerCase().includes('error') ||
    log.message?.toLowerCase().includes('failed')
  );
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors found: ${errors.length}`);
    errors.slice(0, 3).forEach(error => {
      console.log(`  [${error.timestamp}] ${error.namespace}: ${error.message}`);
    });
    if (errors.length > 3) {
      console.log(`  ... and ${errors.length - 3} more`);
    }
  }
  
  // Performance metrics
  const perfLogs = logs.filter(log => 
    log.data?.duration || 
    log.data?.elapsed || 
    log.data?.timing
  );
  
  if (perfLogs.length > 0) {
    console.log(`\n⚡ Performance metrics: ${perfLogs.length} entries`);
    const durations = perfLogs
      .filter(log => log.data?.duration)
      .map(log => log.data.duration);
    
    if (durations.length > 0) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      console.log(`  Average duration: ${avg.toFixed(2)}ms`);
      console.log(`  Max duration: ${max}ms`);
      console.log(`  Min duration: ${min}ms`);
    }
  }
  
  // Time range
  if (logs.length > 0) {
    const first = new Date(logs[0].timestamp);
    const last = new Date(logs[logs.length - 1].timestamp);
    const duration = (last - first) / 1000;
    console.log(`\n🕒 Time range:`);
    console.log(`  First: ${first.toLocaleString()}`);
    console.log(`  Last: ${last.toLocaleString()}`);
    console.log(`  Duration: ${duration.toFixed(2)} seconds`);
  }
}

async function filterCommand(filePath, options = {}) {
  const logs = await readLogFile(filePath);
  let filtered = logs;
  
  // Filter by namespace
  const nsIndex = args.indexOf('--namespace');
  if (nsIndex !== -1 && args[nsIndex + 1]) {
    const namespace = args[nsIndex + 1];
    filtered = filtered.filter(log => log.namespace === namespace);
    console.log(`\n🔍 Filtering by namespace: ${namespace}`);
  }
  
  // Filter by time
  const afterIndex = args.indexOf('--after');
  if (afterIndex !== -1 && args[afterIndex + 1]) {
    const after = new Date(args[afterIndex + 1]);
    filtered = filtered.filter(log => new Date(log.timestamp) > after);
  }
  
  const beforeIndex = args.indexOf('--before');
  if (beforeIndex !== -1 && args[beforeIndex + 1]) {
    const before = new Date(args[beforeIndex + 1]);
    filtered = filtered.filter(log => new Date(log.timestamp) < before);
  }
  
  // Limit results
  const limitIndex = args.indexOf('--limit');
  let limit = 50;
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1]);
  }
  
  console.log(`\nShowing ${Math.min(limit, filtered.length)} of ${filtered.length} entries:\n`);
  
  filtered.slice(0, limit).forEach(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    console.log(`[${time}] [${log.namespace}] ${log.message}`);
    if (log.data) {
      console.log(`  Data: ${JSON.stringify(log.data, null, 2).split('\n').join('\n  ')}`);
    }
  });
}

async function statsCommand(filePath) {
  const logs = await readLogFile(filePath);
  
  console.log('\n📈 Log Statistics');
  console.log('=' .repeat(50));
  
  // Basic stats
  console.log(`\nTotal entries: ${logs.length}`);
  
  // Namespace breakdown
  const namespaces = {};
  logs.forEach(log => {
    namespaces[log.namespace] = (namespaces[log.namespace] || 0) + 1;
  });
  
  console.log('\nTop namespaces:');
  Object.entries(namespaces)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([ns, count], i) => {
      const percent = ((count / logs.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(percent / 2));
      console.log(`  ${i + 1}. ${ns.padEnd(20)} ${bar} ${percent}% (${count})`);
    });
  
  // Request ID stats
  const requestIds = new Set();
  logs.forEach(log => {
    if (log.metadata?.requestId) {
      requestIds.add(log.metadata.requestId);
    }
  });
  
  if (requestIds.size > 0) {
    console.log(`\nUnique request IDs: ${requestIds.size}`);
  }
  
  // Message frequency
  const messages = {};
  logs.forEach(log => {
    const key = `${log.namespace}:${log.message.substring(0, 50)}`;
    messages[key] = (messages[key] || 0) + 1;
  });
  
  console.log('\nMost frequent messages:');
  Object.entries(messages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([msg, count], i) => {
      console.log(`  ${i + 1}. ${msg} (${count} times)`);
    });
}

async function tailCommand(filePath) {
  const logs = await readLogFile(filePath);
  const limit = 50;
  
  console.log(`\n📜 Last ${Math.min(limit, logs.length)} log entries:\n`);
  
  logs.slice(-limit).forEach(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    console.log(`[${time}] [${log.namespace}] ${log.message}`);
    if (log.data) {
      console.log(`  ${JSON.stringify(log.data)}`);
    }
  });
}

async function errorsCommand(filePath) {
  const logs = await readLogFile(filePath);
  
  const errors = logs.filter(log => 
    log.data?.error || 
    log.level === 'error' ||
    log.message?.toLowerCase().includes('error') ||
    log.message?.toLowerCase().includes('failed') ||
    log.message?.toLowerCase().includes('exception')
  );
  
  console.log(`\n❌ Error Logs (${errors.length} found):\n`);
  
  if (errors.length === 0) {
    console.log('No errors found! 🎉');
    return;
  }
  
  errors.forEach(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    console.log(`[${time}] [${log.namespace}] ${log.message}`);
    if (log.data?.error) {
      console.log(`  Error: ${JSON.stringify(log.data.error, null, 2).split('\n').join('\n  ')}`);
    } else if (log.data) {
      console.log(`  Data: ${JSON.stringify(log.data, null, 2).split('\n').join('\n  ')}`);
    }
    console.log('');
  });
}

async function perfCommand(filePath) {
  const logs = await readLogFile(filePath);
  
  const perfLogs = logs.filter(log => 
    log.namespace === 'performance' ||
    log.data?.duration || 
    log.data?.elapsed || 
    log.data?.timing
  );
  
  console.log(`\n⚡ Performance Logs (${perfLogs.length} found):\n`);
  
  if (perfLogs.length === 0) {
    console.log('No performance metrics found.');
    return;
  }
  
  // Group by operation type
  const operations = {};
  perfLogs.forEach(log => {
    const op = log.message || 'Unknown';
    if (!operations[op]) {
      operations[op] = [];
    }
    const duration = log.data?.duration || log.data?.elapsed || log.data?.timing;
    if (duration) {
      operations[op].push(duration);
    }
  });
  
  console.log('Performance by operation:');
  Object.entries(operations).forEach(([op, durations]) => {
    if (durations.length > 0) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      console.log(`\n  ${op}:`);
      console.log(`    Count: ${durations.length}`);
      console.log(`    Avg: ${avg.toFixed(2)}ms`);
      console.log(`    Min: ${min}ms`);
      console.log(`    Max: ${max}ms`);
    }
  });
  
  // Show slowest operations
  const slowest = perfLogs
    .filter(log => log.data?.duration)
    .sort((a, b) => b.data.duration - a.data.duration)
    .slice(0, 5);
  
  if (slowest.length > 0) {
    console.log('\n🐌 Slowest operations:');
    slowest.forEach((log, i) => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      console.log(`  ${i + 1}. [${time}] ${log.message} - ${log.data.duration}ms`);
    });
  }
}

// Main execution
async function main() {
  if (!command || command === 'help') {
    printHelp();
    return;
  }
  
  if (!filePath && command !== 'help') {
    console.error('Error: Please provide a log file path');
    printHelp();
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  switch (command) {
    case 'analyze':
      await analyzeCommand(filePath);
      break;
    case 'filter':
      await filterCommand(filePath);
      break;
    case 'stats':
      await statsCommand(filePath);
      break;
    case 'tail':
      await tailCommand(filePath);
      break;
    case 'errors':
      await errorsCommand(filePath);
      break;
    case 'perf':
      await perfCommand(filePath);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});