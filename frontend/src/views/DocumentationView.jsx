import { useState } from "react";
import { 
  Book, ShieldCheck, Code, Terminal, ArrowLeft, ArrowRight, Lock, 
  Server, Layers, AlertTriangle, Cpu, Radio, Copy, Check, 
  Sparkles, ExternalLink, Zap, Bot, Play
} from "lucide-react";
import { McpSimulationCockpit } from "../components/McpSimulationCockpit.jsx";

export function DocumentationView({ onBack, roleLabel }) {
  const [activeSection, setActiveSection] = useState("intro");
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sections = [
    { id: "intro", label: "Architecture Overview", icon: Book },
    { id: "mcp", label: "Model Context Protocol (MCP)", icon: Bot },
    { id: "simulation", label: "Interactive Simulation Lab", icon: Play },
    { id: "rust", label: "Rust Core & Zeroization", icon: Cpu },
    { id: "threat", label: "8-Signal AI Risk Sentinel", icon: Radio },
    { id: "auth", label: "Authentication Protocols", icon: ShieldCheck },
    { id: "integration", label: "SDK & Handshake Specs", icon: Code },
    { id: "endpoints", label: "Gateway Endpoints", icon: Server },
    { id: "errors", label: "Status & Incident Codes", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-300 flex flex-col md:flex-row">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden p-4 bg-[#050c1c]/90 border-b border-white/[0.08] flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 font-bold text-white font-display">
          <Layers className="w-5 h-5 text-emerald-400" />
          <span>AKIRA Docs</span>
        </div>
        <button onClick={onBack} className="text-xs text-slate-400 hover:text-white font-mono flex items-center gap-1">
          <ArrowLeft size={12} /> Back
        </button>
      </div>

      {/* 🟢 SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-68 bg-[#050b18]/90 border-r border-white/[0.08] flex flex-col backdrop-blur-2xl md:h-screen md:sticky md:top-0 shrink-0">
        <div className="hidden md:block p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 font-bold text-white mb-5 font-display text-base">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/30">
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <span>AKIRA Docs</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">v2.4</span>
            {roleLabel && (
              <span className="text-[9px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 font-mono uppercase font-bold ml-auto">{roleLabel}</span>
            )}
          </div>
          <button
            onClick={onBack}
            className="text-xs font-mono flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Gateway Console
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeSection === item.id
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-md font-semibold"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <item.icon size={16} className="shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 🔵 MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#020617] p-6 sm:p-10 lg:p-12">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

          {/* 1. INTRODUCTION & ARCHITECTURE */}
          {activeSection === "intro" && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase mb-3">
                  <ShieldCheck size={14} /> Zero-Trust Non-Human Identity Gateway
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight mb-3">
                  Architecture & Security Model
                </h1>
                <p className="text-slate-300 text-base leading-relaxed">
                  AKIRA provides an enterprise defense plane that bridges machine identity governance (API keys, client certificates, workload SVIDs) with native memory safety (Rust FFI zeroization) and real-time AI anomaly detection.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard title="Data-At-Rest Cipher" value="AES-256-GCM AEAD" desc="Random 12-byte IV & 16-byte auth tag per key vault entry." />
                <InfoCard title="Human Credentialing" value="Argon2id + 6-Digit MFA" desc="NIST SP 800-63B compliant brute-force resistant hashing." />
                <InfoCard title="Machine Attestation" value="Zero-Allocation Rust FFI" desc="Native memory wiping using the zeroize crate before GC." />
                <InfoCard title="Audit Chain" value="HMAC-SHA256 WORM" desc="Cryptographic hash linked ledger with forensic PDF evidence." />
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#071329] to-emerald-950/40 border border-cyan-500/20 shadow-xl">
                <h3 className="text-cyan-400 font-bold text-base mb-2 flex items-center gap-2">
                  <Lock size={16} /> Zero Trust Principle of Least Privilege
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Static root keys are never exposed directly to business logic. Workloads exchange high-entropy credentials for short-lived (30s–60s) ephemeral SVID tokens bound to the requesting client's IP and specific payment scopes.
                </p>
              </div>
            </div>
          )}

          {/* 🌟 MODEL CONTEXT PROTOCOL (MCP) INTEGRATION */}
          {activeSection === "mcp" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase mb-3">
                  <Bot size={14} /> Agentic AI Governance & Tool-Call Defense
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight mb-3">
                  Model Context Protocol (MCP) Sentinel
                </h2>
                <p className="text-slate-300 text-base leading-relaxed">
                  The open <strong>Model Context Protocol (MCP)</strong> enables autonomous AI agents (Claude, Cursor, Antigravity) to execute tools against internal infrastructure. AKIRA acts as a hardened Zero-Trust MCP Gateway: the LLM is a <strong className="text-white">caller</strong>, never the security <strong className="text-white">decider</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard title="Transport Protocol" value="JSON-RPC 2.0 / SSE" desc="Native HTTP and Server-Sent Events streaming on /api/v1/mcp." />
                <InfoCard title="Identity Invariant" value="Transport-Bound SVID" desc="Cryptographically verified ephemeral SVID re-attested on every invocation." />
                <InfoCard title="Risk Adaptation" value="Closed-Loop Sentinel" desc="Probing or rate limit violations feed directly into agent's own risk score." />
              </div>

              {/* Hardened Invariants Grid */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#071329] to-teal-950/30 border border-emerald-500/20 shadow-xl space-y-4">
                <h3 className="text-emerald-400 font-bold text-base flex items-center gap-2 font-display">
                  <ShieldCheck size={18} /> Six Non-Negotiable Hardening Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-[#040814] border border-white/[0.06]">
                    <p className="font-bold text-white font-mono mb-1">1. Session-Bound Ephemeral SVID</p>
                    <p className="text-slate-400">No static keys. MCP clients authenticate with short-lived SVIDs re-checked for signature, expiry, and revocation per call.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#040814] border border-white/[0.06]">
                    <p className="font-bold text-white font-mono mb-1">2. Confused-Deputy Scoping</p>
                    <p className="text-slate-400">Tool arguments cannot query arbitrary keys outside the calling agent's tenant or authorized domain.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#040814] border border-white/[0.06]">
                    <p className="font-bold text-white font-mono mb-1">3. Closed-Loop Risk Feedback</p>
                    <p className="text-slate-400">Denied calls, scope-probing, or burst rates raise the calling agent's own risk score in the live Risk Engine.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#040814] border border-white/[0.06]">
                    <p className="font-bold text-white font-mono mb-1">4. Fail-Closed Everywhere</p>
                    <p className="text-slate-400">Database faults, rate-limit errors, or audit failures unconditionally resolve to DENY.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#040814] border border-white/[0.06]">
                    <p className="font-bold text-white font-mono mb-1">5. Prompt Injection Boundary</p>
                    <p className="text-slate-400">External strings are structurally tagged with <code className="text-emerald-400">{`{ _untrusted: true }`}</code> and size-capped to 500 chars.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#040814] border border-white/[0.06]">
                    <p className="font-bold text-white font-mono mb-1">6. Target Simulation Eligibility</p>
                    <p className="text-slate-400">Simulations can only target machines explicitly flagged <code className="text-cyan-400">simulationEligible: true</code> in staging/test.</p>
                  </div>
                </div>
              </div>

              {/* MCP Tools Catalog */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                    Available MCP Tools (JSON-RPC 2.0)
                  </h4>
                  <button
                    onClick={() => setActiveSection("simulation")}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    Launch Interactive Lab <ArrowRight size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  <Endpoint method="tools/call" path="get_nhi_profile" desc="Inspects machine registration, scopes, and baseline learning state. (Scope: mcp:nhi:read)" />
                  <Endpoint method="tools/call" path="get_risk_score" desc="Fetches 0-100 real-time risk score, threat level, and containment status. (Scope: mcp:risk:read)" />
                  <Endpoint method="tools/call" path="get_risk_events" desc="Paginated query of anomaly evaluations and incidents. (Scope: mcp:risk:read)" />
                  <Endpoint method="tools/call" path="get_behavioral_baseline" desc="Inspects learned typical hours, normal endpoints, and request velocity. (Scope: mcp:baseline:read)" />
                  <Endpoint method="tools/call" path="investigate_nhi" desc="Compiles full forensic dossier aggregating profile, tokens, and baselines. (Scope: mcp:forensics:read)" />
                  <Endpoint method="tools/call" path="simulate_attack" desc="Executes controlled attack through live AI Risk Sentinel against simulation-eligible keys. (Scope: mcp:simulation:execute)" />
                </div>
              </div>

              {/* Claude Desktop Config Snippet */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  Client Setup (Claude Desktop, Cursor, Antigravity IDE)
                </h4>
                <CodeBlock
                  title="claude_desktop_config.json / mcp_config.json"
                  lang="json"
                  onCopy={() => handleCopy(`{
  "mcpServers": {
    "akira-sentinel": {
      "url": "http://localhost:5001/api/v1/mcp/sse",
      "headers": {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}`, 'mcp-cfg')}
                  copied={copiedKey === 'mcp-cfg'}
                >
{`{
  "mcpServers": {
    "akira-sentinel": {
      "url": "http://localhost:5001/api/v1/mcp/sse",
      "headers": {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}`}
                </CodeBlock>
              </div>
            </div>
          )}

          {/* 🧪 INTERACTIVE ATTACK & MCP SIMULATION LAB */}
          {activeSection === "simulation" && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono uppercase mb-3">
                  <Play size={14} fill="currentColor" /> Live Interactive Simulation Lab
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight mb-2">
                  Interactive Attack & Guardrail Cockpit
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Trigger legitimate requests and adversarial attack scenarios against AKIRA's zero-trust gateway in real-time. Watch the step-by-step pipeline enforce cryptographic attestation, reject prompt injection, calculate risk-adaptive scores, and commit immutable WORM audit receipts.
                </p>
              </div>

              {/* Embed Cockpit Component */}
              <McpSimulationCockpit />
            </div>
          )}

          {/* 2. RUST CORE & ZEROIZATION */}
          {activeSection === "rust" && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <h2 className="text-3xl font-extrabold text-white font-display tracking-tight mb-3">
                  Rust Core & Memory-Safe Zeroization
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  AKIRA compiles a high-performance native Rust library (<code>libnative_core.so</code>) loaded via Bun-FFI to attest machine identities inside unmanaged memory.
                </p>
              </div>

              <CodeBlock 
                title="src/native_core/lib.rs (Attestation & Zeroize)" 
                lang="rust"
                onCopy={() => handleCopy(`use zeroize::Zeroize;

#[no_mangle]
pub extern "C" fn secure_attest(key_ptr: *const u8, len: usize) -> i32 {
    let mut buffer = unsafe { std::slice::from_raw_parts(key_ptr, len).to_vec() };
    let is_valid = verify_entropy_and_signature(&buffer);
    buffer.zeroize(); // Immediate cryptographic zeroization of RAM
    if is_valid { 1 } else { 0 }
}`, 'rust')}
                copied={copiedKey === 'rust'}
              >
{`use zeroize::Zeroize;

#[no_mangle]
pub extern "C" fn secure_attest(key_ptr: *const u8, len: usize) -> i32 {
    let mut buffer = unsafe { std::slice::from_raw_parts(key_ptr, len).to_vec() };
    let is_valid = verify_entropy_and_signature(&buffer);
    buffer.zeroize(); // Immediate cryptographic zeroization of RAM
    if is_valid { 1 } else { 0 }
}`}
              </CodeBlock>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#091122] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-slate-400">Zero-Allocation FFI Overhead:</span>
                  <span className="text-emerald-400 font-bold">&lt; 0.05ms (Sub-millisecond)</span>
                </div>
                <div className="p-4 rounded-xl bg-[#091122] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-slate-400">Side-Channel Attack Resistance:</span>
                  <span className="text-cyan-400 font-bold">Constant-Time Byte Comparison</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. 8-SIGNAL AI RISK SENTINEL */}
          {activeSection === "threat" && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <h2 className="text-3xl font-extrabold text-white font-display tracking-tight mb-3">
                  8-Signal Behavioral Threat Sentinel
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Every inbound machine transaction is evaluated against rolling mathematical baselines. An aggregate score exceeding the containment threshold triggers instantaneous session revocation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <SignalCard code="IP_DEVIATION" weight="+25" desc="Request originating from unlearned or foreign adversary IP." />
                <SignalCard code="SCOPE_ESCALATION" weight="+30" desc="Machine workload invoking high-privilege scopes outside typical profile." />
                <SignalCard code="VELOCITY_SPIKE" weight="+20" desc="Burst rate exceeding 3x learned standard moving average." />
                <SignalCard code="FAILED_ATTESTATION" weight="+35" desc="Rust FFI fingerprint or cryptographic signature mismatch." />
                <SignalCard code="HIGH_VALUE_SCOPE" weight="+15" desc="Sensitive payment batch settlement or refund processing." />
                <SignalCard code="TIME_ANOMALY" weight="+10" desc="Invocations occurring outside normal operational UTC windows." />
                <SignalCard code="EXPIRED_CREDENTIAL" weight="+40" desc="Use of invalidated, rotated, or expired root keys." />
                <SignalCard code="POLICY_MATCH" weight="+20" desc="Direct match against active administrator containment rule." />
              </div>
            </div>
          )}

          {/* 4. AUTHENTICATION PROTOCOLS */}
          {activeSection === "auth" && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <h2 className="text-3xl font-extrabold text-white font-display tracking-tight mb-3">
                  Authentication Protocols
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Strict separation between Human Control Plane authentication (Argon2id + MFA) and Machine Data Plane authentication (High-Entropy Root Keys + Ephemeral SVIDs).
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  Machine Token Exchange (RFC 8705 PoP)
                </h4>
                <CodeBlock 
                  title="POST /v1/auth/token" 
                  lang="http"
                  onCopy={() => handleCopy(`POST /v1/auth/token HTTP/1.1
Host: api.akira.soc
X-AKIRA-MACHINE-KEY: ak_live_9a7b8c...
Content-Type: application/json

{
  "scope": "payment:settle",
  "client_ip": "10.0.4.12",
  "ttl": 60
}`, 'auth-req')}
                  copied={copiedKey === 'auth-req'}
                >
{`POST /v1/auth/token HTTP/1.1
Host: api.akira.soc
X-AKIRA-MACHINE-KEY: ak_live_9a7b8c...
Content-Type: application/json

{
  "scope": "payment:settle",
  "client_ip": "10.0.4.12",
  "ttl": 60
}`}
                </CodeBlock>
              </div>
            </div>
          )}

          {/* 5. INTEGRATION SDK */}
          {activeSection === "integration" && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <h2 className="text-3xl font-extrabold text-white font-display tracking-tight mb-3">
                  Integration SDK & Client Code
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Integrate AKIRA into your Node.js, Python, or Go microservices.
                </p>
              </div>

              <CodeBlock 
                title="Node.js Client Integration" 
                lang="javascript"
                onCopy={() => handleCopy(`import { AkiraClient } from '@akira/sdk';

const akira = new AkiraClient({
  apiKey: process.env.AKIRA_MACHINE_KEY,
  gatewayUrl: 'https://api.akira.soc',
  autoRotate: true
});

// Automatic token exchange & Rust attestation
const response = await akira.invoke({
  scope: 'payment:settle',
  payload: { batchId: 'BATCH-9941', amount: 15400.00 }
});

console.log('Attestation status:', response.status);`, 'sdk-node')}
                copied={copiedKey === 'sdk-node'}
              >
{`import { AkiraClient } from '@akira/sdk';

const akira = new AkiraClient({
  apiKey: process.env.AKIRA_MACHINE_KEY,
  gatewayUrl: 'https://api.akira.soc',
  autoRotate: true
});

// Automatic token exchange & Rust attestation
const response = await akira.invoke({
  scope: 'payment:settle',
  payload: { batchId: 'BATCH-9941', amount: 15400.00 }
});

console.log('Attestation status:', response.status);`}
              </CodeBlock>
            </div>
          )}

          {/* 6. GATEWAY ENDPOINTS */}
          {activeSection === "endpoints" && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <h2 className="text-3xl font-extrabold text-white font-display tracking-tight mb-3">
                  Gateway API Endpoints
                </h2>
                <p className="text-slate-300 text-sm sm:text-base">
                  Core REST endpoints for key generation, risk telemetry, audit logs, and governance.
                </p>
              </div>

              <div className="space-y-3">
                <Endpoint method="POST" path="/api/auth/login" desc="Initiate Argon2id challenge" />
                <Endpoint method="POST" path="/api/auth/verify-mfa" desc="Finalize 6-digit OTP session" />
                <Endpoint method="GET" path="/api/keys" desc="List vaulted key fingerprints" />
                <Endpoint method="POST" path="/api/keys/generate" desc="Issue high-entropy AES-256 key" />
                <Endpoint method="POST" path="/api/keys/:id/rotate" desc="Trigger Rust Chaos Engine key rotation" />
                <Endpoint method="GET" path="/v1/risk/stats" desc="Live AI risk sentinel telemetry" />
                <Endpoint method="GET" path="/v1/risk/events" desc="Real-time anomaly event stream" />
                <Endpoint method="POST" path="/v1/risk/containment/:id/quarantine" desc="Instant key lockdown" />
                <Endpoint method="GET" path="/api/audit-logs" desc="HMAC WORM tamper-proof log stream" />
              </div>
            </div>
          )}

          {/* 7. STATUS & INCIDENT CODES */}
          {activeSection === "errors" && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <h2 className="text-3xl font-extrabold text-white font-display tracking-tight mb-3">
                  Security Exceptions & Incident Codes
                </h2>
                <p className="text-slate-300 text-sm sm:text-base">
                  Standardized status codes returned by the AKIRA AI Risk Gateway.
                </p>
              </div>

              <div className="space-y-3.5">
                <ErrorCode code="401" title="INVALID_CREDENTIALS" desc="Bearer token expired, SVID revoked, or Rust attestation failed." />
                <ErrorCode code="403" title="ACCESS_DENIED_RBAC" desc="Human or machine identity lacks required RBAC permission tier." />
                <ErrorCode code="423" title="IDENTITY_QUARANTINED" desc="Machine locked by AI Threat Sentinel due to anomaly score exceeding threshold." />
                <ErrorCode code="429" title="VELOCITY_ANOMALY_THROTTLED" desc="Request frequency exceeded moving baseline standard deviation." />
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
    <div className="p-5 rounded-2xl bg-[#091122]/90 border border-white/[0.08] shadow-lg">
      <p className="text-slate-400 text-xs uppercase tracking-wider font-mono font-semibold mb-1">{title}</p>
      <p className="text-xl font-mono font-bold text-emerald-400 mb-1.5">{value}</p>
      <p className="text-slate-300 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function SignalCard({ code, weight, desc }) {
  return (
    <div className="p-4 rounded-xl bg-[#081020]/90 border border-white/[0.08] shadow-md flex items-start gap-3">
      <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold shrink-0">
        {weight}
      </span>
      <div>
        <p className="font-mono text-xs font-bold text-white">{code}</p>
        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function CodeBlock({ title, lang, onCopy, copied, children }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#070e1c] shadow-2xl">
      <div className="px-4 py-2.5 bg-[#0a1326] border-b border-white/[0.06] flex justify-between items-center">
        <span className="text-xs font-mono text-slate-400">{title}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase bg-white/[0.05] px-2 py-0.5 rounded">{lang}</span>
          {onCopy && (
            <button 
              onClick={onCopy}
              className="text-xs font-mono text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>
      </div>
      <div className="p-5 overflow-x-auto">
        <pre className="font-mono text-xs sm:text-sm text-slate-300 leading-relaxed">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

function Endpoint({ method, path, desc }) {
  const isPost = method === "POST";
  return (
    <div className="p-3.5 rounded-xl bg-[#081020]/90 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-3 shadow-md">
      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold w-fit ${isPost ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30" : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"}`}>
        {method}
      </span>
      <span className="font-mono text-xs sm:text-sm text-white font-semibold">{path}</span>
      <span className="text-slate-400 text-xs sm:ml-auto">{desc}</span>
    </div>
  );
}

function ErrorCode({ code, title, desc }) {
  return (
    <div className="p-4 rounded-xl bg-[#081020]/90 border border-rose-500/20 flex items-start gap-4 shadow-md">
      <span className="font-mono text-base font-bold text-rose-400 shrink-0 w-12">{code}</span>
      <div>
        <p className="text-white font-bold text-sm font-mono">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}