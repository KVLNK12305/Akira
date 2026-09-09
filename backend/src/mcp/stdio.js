import readline from 'readline';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { dispatchMcpRequest } from './server.js';

dotenv.config();

// 1. Connect DB for standalone process
await connectDB();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const authHeader = process.env.AKIRA_SVID_TOKEN
  ? (process.env.AKIRA_SVID_TOKEN.startsWith('Bearer ') ? process.env.AKIRA_SVID_TOKEN : `Bearer ${process.env.AKIRA_SVID_TOKEN}`)
  : null;

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const rpcRequest = JSON.parse(trimmed);
    const rpcResponse = await dispatchMcpRequest({
      rpcRequest,
      authHeader,
      clientIP: '127.0.0.1 (stdio)'
    });

    if (rpcResponse) {
      process.stdout.write(JSON.stringify(rpcResponse) + '\n');
    }
  } catch (err) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: Malformed JSON string' }
    }) + '\n');
  }
});

process.stderr.write('AKIRA Sentinel MCP stdio transport online.\n');
