
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runHardcoreTest() {
    console.log("🚀 STARTING HARDCORE SECURITY RADIUS TEST...");

    // Test 1: NoSQL Injection on Login
    console.log("\n🧪 TEST 1: NoSQL Injection (Login Bypass Attempt)");
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: { "$gt": "" },
            password: "any"
        });
        console.log("❌ FAIL: Server responded with status", res.status);
    } catch (err) {
        console.log("✅ PASS: Request blocked/rejected as expected:", err.response?.data?.error || err.message);
    }

    // Test 2: Mass Assignment (Privilege Escalation during Registration)
    console.log("\n🧪 TEST 2: Mass Assignment (Admin Escalate Attempt)");
    try {
        const testUser = `hacker_${Date.now()}`;
        const res = await axios.post(`${BASE_URL}/auth/register`, {
            username: testUser,
            email: `${testUser}@vuln.com`,
            password: "Password123!",
            role: "Admin"
        });

        if (res.data.user.role === 'Admin') {
            console.log("❌ FAIL: User was successfully registered as Admin!");
        } else {
            console.log("✅ PASS: User registered as", res.data.user.role, "(Expected: Developer)");
        }
    } catch (err) {
        console.log("⚠️ INFO: Registration failed (might be expected if server validates strictly):", err.response?.data?.error || err.message);
    }

    // Test 3: OTP Brute Force Simulation (Logical Check)
    console.log("\n🧪 TEST 3: OTP Brute Force & Type Confusion");
    try {
        // Attempt to send an array or object as OTP to bypass string comparison
        const res = await axios.post(`${BASE_URL}/auth/verify-mfa`, {
            email: "admin@example.com",
            otp: ["123456"]
        });
        console.log("❌ FAIL: Server accepted non-string OTP!");
    } catch (err) {
        console.log("✅ PASS: Non-string OTP rejected:", err.response?.data?.error || err.message);
    }

    // Test 4: Profile Username Injection (XSS/NoSQLi)
    console.log("\n🧪 TEST 4: Profile Update Injection");
    try {
        // Using a fake token or attempt without one to check for 401 first, 
        // but here we check if it even processes the object
        const res = await axios.put(`${BASE_URL}/users/update-profile`, {
            username: { "$ne": "admin" }
        });
    } catch (err) {
        if (err.response?.status === 401) {
            console.log("✅ PASS: Unauthenticated request blocked.");
        } else {
            console.log("✅ PASS: Input processed safely or rejected:", err.response?.data?.error || err.message);
        }
    }

    console.log("\n🏁 HARDCORE TEST COMPLETE.");
}

runHardcoreTest();
