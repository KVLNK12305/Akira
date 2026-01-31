import { useState } from "react";
import { Book, Shield, Code, Terminal, ArrowLeft, Lock, Server, Layers} from "lucide-react";

export function DocumentationView({ onBack, roleLabel }) {
  const [activeSection, setActiveSection] = useState("intro");

  const sections = [
    { id: "intro", label: "Introduction", icon: Book },
    { id: "auth", label: "Authentication", icon: Shield },
    { id: "integration", label: "Integration SDK", icon: Code },
    { id: "endpoints", label: "API Endpoints", icon: Server },
    { id: "errors", label: "Error Codes", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-emerald-500/30 flex fixed inset-0">
      
      {/* 🟢 SIDEBAR */}
      <aside className="w-64 bg-slate-900/50 border-r border-white/5 flex flex-col backdrop-blur-xl">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2 font-bold text-white mb-6">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            SecureDocs <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">v2.4</span>
            {roleLabel && (
              <span className="text-[10px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 uppercase">{roleLabel}</span>
            )}
          </div>
          <button 
            onClick={onBack}
            className="text-xs flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={12} /> Back to Gateway
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeSection === item.id 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* 🔵 MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto p-12">
          
          {/* CONTENT: INTRODUCTION */}
          {activeSection === "intro" && (
            <div className="space-y-8 animate-[fade-in_0.5s]">
              <div>
                <h1 className="text-4xl font-bold text-white mb-4">Secure Gateway Documentation</h1>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Welcome to the developer hub for the <strong>Secure API Gateway</strong>. This system provides a unified interface for managing access control, encrypting sensitive data, and auditing API usage across your microservices architecture.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoCard title="Encryption Standard" value="AES-256-CBC" desc="All keys are encrypted at rest." />
                <InfoCard title="Hashing Algo" value="Argon2id" desc="NIST-compliant password storage." />
              </div>

              <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><Lock size={16}/> Security First</h3>
                <p className="text-sm text-slate-400">
                  This system enforces a strict <strong>Zero Trust</strong> policy. All requests must be authenticated via a signed JWT and authorized against the RBAC matrix before processing.
                </p>
              </div>
            </div>
          )}

          {/* CONTENT: AUTHENTICATION */}
          {activeSection === "auth" && (
            <div className="space-y-8 animate-[fade-in_0.5s]">
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Authentication Flow</h2>
                <p className="text-slate-400 mb-6">
                  The gateway uses a 2-stage authentication process involving a standard password challenge followed by a Time-Based One-Time Password (TOTP).
                </p>
              </div>

              <CodeBlock title="Request Headers" lang="http">
                {`Authorization: Bearer <your_jwt_token>
X-API-Key: sk_live_8923...`}
              </CodeBlock>

              <div className="space-y-4">
                <Step number="1" title="Initial Handshake" desc="Client sends credentials securely over TLS 1.3." />
                <Step number="2" title="MFA Challenge" desc="Server validates hash and requests 6-digit TOTP." />
                <Step number="3" title="Session Issue" desc="Upon validation, a signed JWT is issued with a 15-minute expiry." />
              </div>
            </div>
          )}

          {/* CONTENT: INTEGRATION */}
          {activeSection === "integration" && (
            <div className="space-y-8 animate-[fade-in_0.5s]">
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">SDK Integration</h2>
                <p className="text-slate-400">
                  Install our lightweight SDK to start protecting your endpoints instantly.
                </p>
              </div>

              <CodeBlock title="Terminal" lang="bash">
                {`pnpm install @secure-gateway/sdk`}
              </CodeBlock>

              <CodeBlock title="server.js" lang="javascript">
                {`import { Gateway } from '@secure-gateway/sdk';

const security = new Gateway({
  apiKey: process.env.GATEWAY_KEY,
  encryption: 'AES-256'
});

// Protect a route
app.get('/api/sensitive', security.protect(), (req, res) => {
  res.json({ data: "Encrypted Payload" });
});`}
              </CodeBlock>
            </div>
          )}

           {/* CONTENT: ENDPOINTS */}
           {activeSection === "endpoints" && (
            <div className="space-y-8 animate-[fade-in_0.5s]">
              <h2 className="text-3xl font-bold text-white mb-6">Core API Endpoints</h2>
              
              <Endpoint method="POST" path="/auth/login" desc="Initiate session and receive MFA challenge." />
              <Endpoint method="POST" path="/auth/verify" desc="Submit OTP and receive Session Token." />
              <Endpoint method="GET" path="/keys" desc="List all active API keys (Masked)." />
              <Endpoint method="POST" path="/keys/generate" desc="Issue a new encrypted API key." />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function InfoCard({ title, value, desc }) {
  return (
    <div className="p-6 rounded-xl bg-slate-900 border border-white/5">
      <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">{title}</p>
      <p className="text-2xl font-mono text-emerald-400 mb-2">{value}</p>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  )
}

function CodeBlock({ title, lang, children }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117]">
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <span className="text-xs font-mono text-slate-500">{title}</span>
        <span className="text-xs font-mono text-slate-600 uppercase">{lang}</span>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-sm text-slate-300">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  )
}

function Step({ number, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
        {number}
      </div>
      <div>
        <h4 className="font-bold text-white">{title}</h4>
        <p className="text-slate-400 text-sm">{desc}</p>
      </div>
    </div>
  )
}

function Endpoint({ method, path, desc }) {
  const colors = { POST: "text-blue-400 bg-blue-500/10", GET: "text-emerald-400 bg-emerald-500/10" };
  return (
    <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center gap-4">
      <span className={`px-2 py-1 rounded text-xs font-bold ${colors[method]}`}>{method}</span>
      <span className="font-mono text-sm text-white">{path}</span>
      <span className="text-slate-500 text-sm ml-auto">{desc}</span>
    </div>
  )
}

import { AlertTriangle } from "lucide-react";