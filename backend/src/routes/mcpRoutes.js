import express from 'express';
import crypto from 'crypto';
import { dispatchMcpRequest } from '../mcp/server.js';
import { TOOL_DEFINITIONS } from '../mcp/policies/tool-policy.js';
import { getOrCreateSession } from '../mcp/session.js';
import { checkAuditChainIntegrity } from '../mcp/audit.js';

const router = express.Router();

/**
 * @desc    Standard MCP JSON-RPC 2.0 Endpoint
 * @route   POST /api/v1/mcp
 */
router.post('/', async (req, res) => {
  const sessionId = req.query.sessionId || req.headers['x-mcp-session-id'] || null;
  const authHeader = req.headers.authorization;
  const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';

  const rpcResponse = await dispatchMcpRequest({
    rpcRequest: req.body,
    authHeader,
    sessionId,
    clientIP
  });

  if (!rpcResponse) {
    return res.status(204).end(); // Notification
  }

  // Map JSON-RPC errors to security-conscious HTTP status codes
  if (rpcResponse.error) {
    if (rpcResponse.error.code === 429) {
      return res.status(429).json(rpcResponse);
    }
    if (rpcResponse.error.code === -32001 || rpcResponse.error.data?.code === 'PARENT_QUARANTINED') {
      return res.status(403).json(rpcResponse);
    }
    if (rpcResponse.error.code === -32600) {
      return res.status(400).json(rpcResponse);
    }
  }

  return res.status(200).json(rpcResponse);
});

/**
 * @desc    Server-Sent Events (SSE) stream for MCP desktop & IDE clients
 * @route   GET /api/v1/mcp/sse
 */
router.get('/sse', (req, res) => {
  const sessionId = crypto.randomUUID();
  getOrCreateSession(sessionId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // 1. Send the endpoint URI to the client as required by the MCP SSE spec
  const endpointUrl = `/api/v1/mcp?sessionId=${sessionId}`;
  res.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);

  // 2. Keep-alive heartbeat every 15s
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * @desc    List registered MCP Tools metadata (Used by Documentation & UI Simulator)
 * @route   GET /api/v1/mcp/tools
 */
router.get('/tools', (req, res) => {
  res.json({
    success: true,
    tools: Object.values(TOOL_DEFINITIONS)
  });
});

/**
 * @desc    Scheduled / Manual Audit Chain Integrity Check (§14)
 * @route   GET /api/v1/mcp/audit/verify-chain
 */
router.get('/audit/verify-chain', async (req, res) => {
  const result = await checkAuditChainIntegrity();
  res.json(result);
});

export default router;
