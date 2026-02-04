import { useState } from "react";
import { Book, Shield, Code, Terminal, ArrowLeft, Lock, Server, Layers, AlertTriangle } from "lucide-react";

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
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-emerald-500/30 flex flex-col md:flex-row">
      <div className="md:hidden p-4 bg-slate-900/80 border-b border-white/5 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-white">
          <Layers className="w-5 h-5 text-emerald-400" />
          SecureDocs
        </div>
        <button onClick={onBack} className="text-xs text-slate-400">Back</button>
      </div>

      {/* 🟢 SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900/50 border-r border-white/5 flex flex-col backdrop-blur-xl md:h-screen md:sticky md:top-0">
        <div className="hidden md:block p-6 border-b border-white/5">
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeSection === item.id
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard title="Encryption Standard" value="AES-256-GCM" desc="Vault keys are hardware-encrypted at rest." />
                <InfoCard title="Hashing Algo" value="Argon2id" desc="NIST-compliant user password storage." />
              </div>

              <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><Lock size={16} /> Zero Trust Architecture</h3>
                <p className="text-sm text-slate-400">
                  This system enforces a strict <strong>Zero Trust</strong> policy. Every request—whether from a human user or a machine—must be authenticated via signed JWT or Hashed API Keys.
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
                  Akira supports multi-factor authentication for humans and high-entropy key validation for machines.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-widest bg-slate-800/50 w-fit px-3 py-1 rounded">Human Identity (JWT)</h4>
                  <CodeBlock title="Request Header" lang="http">
                    {`Authorization: Bearer <your_jwt_session_token>`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-widest bg-slate-800/50 w-fit px-3 py-1 rounded">Machine Identity (API Key)</h4>
                  <CodeBlock title="Request Header" lang="http">
                    {`Authorization: Bearer akira_<your_generated_key>`}
                  </CodeBlock>
                </div>
              </div>

              <div className="space-y-4">
                <Step number="1" title="Primary Challenge" desc="Credentials (Email/Pass or Google OAuth) are verified against Argon2 hashes." />
                <Step number="2" title="Email MFA" desc="A 6-digit security code is dispatched to the registered email address." />
                <Step number="3" title="Session Issue" desc="Upon OTP validation, a signed JWT is issued for short-term access." />
              </div>
            </div>
          )}

          {/* CONTENT: INTEGRATION */}
          {activeSection === "integration" && (
            <div className="space-y-8 animate-[fade-in_0.5s]">
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Machine Handshake</h2>
                <p className="text-slate-400">
                  Machines authenticate using high-entropy keys. The gateway never stores raw keys—only SHA-256 fingerprints.
                </p>
              </div>

              <CodeBlock title="Node.js Integration" lang="javascript">
                {`const response = await fetch('http://localhost:5000/api/v1/secret-report', {
  headers: {
    'Authorization': 'Bearer akira_LIVE_KEY_HERE'
  }
});

const data = await response.json();
console.log(data.identity); // Authenticated as [Machine Name]`}
              </CodeBlock>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <p className="text-xs text-emerald-400 font-mono italic">
                  Tip: Use the "Guardian Eye" lab to live-trace the verification handshake process, including fingerprint matching and scope validation.
                </p>
              </div>
            </div>
          )}

          {/* CONTENT: ENDPOINTS */}
          {activeSection === "endpoints" && (
            <div className="space-y-8 animate-[fade-in_0.5s]">
              <h2 className="text-3xl font-bold text-white mb-6">System API Reference</h2>

              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase">Authentication</div>
                <Endpoint method="POST" path="/api/auth/login" desc="Initiate challenge." />
                <Endpoint method="POST" path="/api/auth/verify-mfa" desc="Finalize session." />

                <div className="text-xs font-bold text-slate-500 uppercase pt-4">Key Management</div>
                <Endpoint method="GET" path="/api/keys" desc="List fingerprints." />
                <Endpoint method="POST" path="/api/keys/generate" desc="Issue new identity." />

                <div className="text-xs font-bold text-slate-500 uppercase pt-4">Internal Services</div>
                <Endpoint method="POST" path="/api/v1/nhi-validate" desc="Live lab simulation." />
                <Endpoint method="GET" path="/api/audit-logs" desc="Security event stream." />
                <Endpoint method="GET" path="/api/audit-logs/export" desc="Signed JSON report." />
              </div>
            </div>
          )}

          {/* CONTENT: ERROR CODES */}
          {activeSection === "errors" && (
            <div className="space-y-8 animate-[fade-in_0.5s]">
              <h2 className="text-3xl font-bold text-white mb-6">Security Exceptions</h2>
              <p className="text-slate-400">Common status codes returned by the Akira Secure Gateway.</p>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center gap-4">
                  <span className="font-mono text-sm font-bold text-red-400 w-20">401</span>
                  <div>
                    <p className="text-white font-bold text-sm">INVALID_CREDENTIALS</p>
                    <p className="text-xs text-slate-500">Bearer token expired or API Key fingerprint mismatch.</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center gap-4">
                  <span className="font-mono text-sm font-bold text-red-400 w-20">403</span>
                  <div>
                    <p className="text-white font-bold text-sm">ACCESS_DENIED</p>
                    <p className="text-xs text-slate-500">Identity exists but lacks sufficient RBAC privileges.</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/10 flex items-center gap-4">
                  <span className="font-mono text-sm font-bold text-orange-400 w-20">404</span>
                  <div>
                    <p className="text-white font-bold text-sm">NOT_FOUND</p>
                    <p className="text-xs text-slate-500">Resource or referenced identity does not exist.</p>
                  </div>
                </div>
              </div>
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