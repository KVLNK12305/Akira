import { useState, useRef } from "react";
import {
    User, Camera, Key, Mail, Shield, ArrowLeft,
    Check, Loader2, AlertTriangle, Eye, EyeOff, Upload, LogOut
} from "lucide-react";
import api, { API_URL } from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function ProfileView({ onBack, onLogout }) {
    const { user, updateUser, logout } = useAuth();
    const fileInputRef = useRef(null);

    // Profile Update State
    const [username, setUsername] = useState(user?.username || "");
    const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [updateMsg, setUpdateMsg] = useState({ type: "", text: "" });

    // Password Change State
    const [step, setStep] = useState(1); // 1: Request, 2: Verification
    const [newPassword, setNewPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [passMsg, setPassMsg] = useState({ type: "", text: "" });

    // 🛡️ CUSTOM MODAL STATE
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        isDestructive: false
    });

    // 🔔 NOTIFICATION STATE
    const [notification, setNotification] = useState(null);

    const notify = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };


    // --- Handlers ---

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                return setUpdateMsg({ type: "error", text: "Please select an image file" });
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadAvatar = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        setUpdateMsg({ type: "", text: "" });

        const formData = new FormData();
        formData.append('avatar', selectedFile);

        try {
            const res = await api.post('/users/upload-avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                setProfilePicture(res.data.imageUrl);
                setPreviewUrl(null);
                setSelectedFile(null);
                // Also update backend profile immediately
                await api.put('/users/update-profile', {
                    username: username,
                    profilePicture: res.data.imageUrl
                });
                updateUser({ profilePicture: res.data.imageUrl });
                notify("Profile picture updated!", "success");
            }
        } catch (err) {
            setUpdateMsg({ type: "error", text: err.response?.data?.error || "Upload failed" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        setUpdateMsg({ type: "", text: "" });

        try {
            const res = await api.put('/users/update-profile', { username, profilePicture });
            if (res.data.success) {
                updateUser(res.data.user);
                notify("Profile updated successfully!", "success");
            }
        } catch (err) {
            setUpdateMsg({ type: "error", text: err.response?.data?.error || "Failed to update profile" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleResetProfile = () => {
        setUsername(user?.username || "");
        setProfilePicture(user?.profilePicture || "");
        setPreviewUrl(null);
        setSelectedFile(null);
        setUpdateMsg({ type: "", text: "" });
    };

    const handleRequestOTP = async () => {
        if (!newPassword) return setPassMsg({ type: "error", text: "Enter a new password first" });

        // CLIENT-SIDE VALIDATION
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_\-\.]).{8,}$/;
        if (!passRegex.test(newPassword)) {
            return setPassMsg({
                type: "error",
                text: "Security Policy: Need 8+ chars, 1 Upper, 1 Lower, 1 Number, 1 Special (!@#$%^&*_-.)."
            });
        }

        setIsLoading(true);
        setPassMsg({ type: "", text: "" });

        try {
            const res = await api.post('/users/request-password-change');
            if (res.data.success) {
                setStep(2);
                notify("OTP sent to your email!", "success");
            }
        } catch (err) {
            setPassMsg({ type: "error", text: err.response?.data?.error || "Failed to request OTP" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmPassword = async () => {
        if (!otp) return setPassMsg({ type: "error", text: "Enter the OTP" });
        setIsLoading(true);
        setPassMsg({ type: "", text: "" });

        try {
            const res = await api.post('/users/confirm-password-change', { otp, newPassword });
            if (res.data.success) {
                notify("Password changed successfully!", "success");
                setNewPassword("");
                setOtp("");
                setStep(1);
            }
        } catch (err) {
            setPassMsg({ type: "error", text: err.response?.data?.error || "Invalid OTP" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-900 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Account <span className="text-emerald-400">Profile</span></h1>
                        <p className="text-slate-500 text-sm">Manage your identity and security settings</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Avatar & Basic Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center backdrop-blur-xl">
                            <div className="relative inline-block mb-4">
                                <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center text-4xl font-bold text-white overflow-hidden shadow-2xl mx-auto">
                                    {previewUrl || profilePicture ? (
                                        <img
                                            src={previewUrl || (profilePicture?.startsWith('http') ? profilePicture : `${API_URL}${profilePicture}`)}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        user?.username?.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="absolute bottom-0 right-0 p-2 bg-emerald-500 text-black rounded-full hover:bg-emerald-400 transition-all shadow-lg border-2 border-slate-950"
                                    title="Upload Photo"
                                >
                                    <Camera size={16} />
                                </button>
                            </div>

                            {selectedFile && (
                                <div className="mt-2 animate-bounce">
                                    <button
                                        onClick={handleUploadAvatar}
                                        disabled={isUploading}
                                        className="text-[10px] bg-emerald-500 text-black px-3 py-1 rounded-full font-bold flex items-center gap-1 mx-auto hover:bg-emerald-400"
                                    >
                                        {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                                        CONFIRM UPLOAD
                                    </button>
                                </div>
                            )}

                            <h2 className="text-xl font-bold text-white mb-1">{user?.username}</h2>
                            <p className="text-slate-500 text-sm font-mono mb-4">{user?.email}</p>

                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-widest">
                                <Shield size={12} /> {user?.role}
                            </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500 uppercase font-bold">Account ID</span>
                                <span className="text-slate-400 font-mono">{user?._id?.substring(0, 12) || "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500 uppercase font-bold">MFA Status</span>
                                <span className="text-emerald-500 font-bold">ACTIVE</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500 uppercase font-bold">Member Since</span>
                                <span className="text-slate-400">{new Date(user?.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setConfirmModal({
                                    isOpen: true,
                                    title: "Sign Out?",
                                    message: "Are you sure you want to end your secure session?",
                                    isDestructive: false,
                                    onConfirm: onLogout
                                });
                            }}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold transition-all group"
                        >
                            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                            SIGN OUT OF AKIRA
                        </button>
                    </div>

                    {/* Right Column: Editing & Security */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Profile Update Form */}
                        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                            <div className="p-6 border-b border-slate-800">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <User size={18} className="text-emerald-400" /> Edit Profile
                                </h3>
                            </div>
                            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Profile Picture Source</label>
                                        <input
                                            type="text"
                                            value={profilePicture}
                                            readOnly
                                            placeholder="Upload a photo from device"
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-500 cursor-not-allowed italic"
                                        />
                                    </div>
                                </div>

                                {updateMsg.text && (
                                    <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${updateMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                        {updateMsg.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                                        {updateMsg.text}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2 rounded-lg text-sm transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isUpdating ? <Loader2 className="animate-spin" size={16} /> : "Save Changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetProfile}
                                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors border border-slate-700"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Password Change Section */}
                        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Key size={18} className="text-emerald-400" /> Security
                                </h3>
                                <div className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 font-bold">MFA SECURED</div>
                            </div>
                            <div className="p-6 space-y-6">

                                {step === 1 ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-400">To change your password, we'll need to verify your identity via email OTP.</p>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPass ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                                />
                                                <button
                                                    onClick={() => setShowPass(!showPass)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                                >
                                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleRequestOTP}
                                            disabled={isLoading || !newPassword}
                                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors border border-slate-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" size={16} /> : "Send Verification Code"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-[fade-in_0.3s]">
                                        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs">
                                            <Mail size={16} />
                                            <p>Check <strong>{user?.email}</strong> for a 6-digit security code.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Verification Code</label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                placeholder="000000"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:border-emerald-500 transition-colors text-emerald-400"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleConfirmPassword}
                                                disabled={isLoading || otp.length !== 6}
                                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 rounded-lg text-sm transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isLoading ? <Loader2 className="animate-spin" size={16} /> : "Confirm Change"}
                                            </button>
                                            <button
                                                onClick={() => setStep(1)}
                                                className="px-4 text-slate-500 hover:text-white text-xs underline"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {passMsg.text && (
                                    <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${passMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                        {passMsg.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                                        {passMsg.text}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* 🛡️ SYSTEM OVERLAYS */}
            <ConfirmationModal
                {...confirmModal}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
            {notification && <Toast {...notification} />}
        </div>
    );
}

// 4. Custom Confirmation Modal
function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel, isDestructive }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-[fade-in_0.2s]"
                onClick={onCancel}
            ></div>
            <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-[scale-in_0.2s] ring-1 ring-white/10">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 border ${isDestructive ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onCancel(); }}
                        className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all shadow-lg ${isDestructive ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

// 5. Toast Notification
function Toast({ msg, type }) {
    if (!msg) return null;
    return (
        <div className={`fixed bottom-8 right-8 z-[10001] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl animate-[slide-in-right_0.3s] ${type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'}`}>
            {type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
            <span className="font-bold text-sm tracking-tight">{msg}</span>
        </div>
    );
}

// Need to import these specifically for the sub-components to work correctly or they must be defined in the same file
import { XCircle, CheckCircle } from "lucide-react";
