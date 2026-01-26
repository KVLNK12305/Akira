import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { AuthLayout } from "../layouts/AuthLayout";
import { Input } from "../components/UI/Input";
import { Button } from "../components/UI/Button";

export function MFAView({ onVerify, loading }) {
  const [otp, setOtp] = useState("");

  return (
    <AuthLayout title="Multi-Factor Auth">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-4">
          <Fingerprint className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-slate-400 text-sm">Enter the OTP sent to your secure device.</p>
        <p className="text-slate-600 text-xs mt-1">(Demo Code: 123456)</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onVerify(otp); }} className="space-y-4">
        <Input 
          className="text-center tracking-[0.5em] text-xl font-mono" 
          placeholder="000000" 
          maxLength={6}
          value={otp}
          onChange={e => setOtp(e.target.value)}
        />
        <Button loading={loading}>Verify Identity</Button>
      </form>
    </AuthLayout>
  );
}