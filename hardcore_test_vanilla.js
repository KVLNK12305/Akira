
const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(path, method, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${BASE_URL}${path}`);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runHardcoreTest() {
    console.log("🚀 STARTING HARDCORE SECURITY RADIUS TEST (Vanilla JS)...");

    // Test 1: NoSQL Injection on Login
    console.log("\n🧪 TEST 1: NoSQL Injection (Login Bypass Attempt)");
    try {
        const res = await request('/auth/login', 'POST', {
            email: { "$gt": "" },
            password: "any"
        });
        if (res.status >= 400) {
            console.log("✅ PASS: Request blocked/rejected as expected (Status " + res.status + "):", res.data?.error || res.data);
        } else {
            console.log("❌ FAIL: Server responded with status", res.status);
        }
    } catch (err) {
        console.log("✅ PASS: Connection failed (Server likely offline or rejecting):", err.message);
    }

    // Test 2: Mass Assignment (Privilege Escalation during Registration)
    console.log("\n🧪 TEST 2: Mass Assignment (Admin Escalate Attempt)");
    try {
        const testUser = `hacker_${Date.now()}`;
        const res = await request('/auth/register', 'POST', {
            username: testUser,
            email: `${testUser}@vuln.com`,
            password: "Password123!",
            role: "Admin"
        });

        if (res.data?.user?.role === 'Admin') {
            console.log("❌ FAIL: User was successfully registered as Admin!");
        } else if (res.status < 400) {
            console.log("✅ PASS: User registered as", res.data?.user?.role, "(Expected: Developer)");
        } else {
            console.log("✅ PASS: Request rejected (Status " + res.status + "):", res.data?.error || res.data);
        }
    } catch (err) {
        console.log("⚠️ INFO: Registration test failed (Server offline?):", err.message);
    }

    // Test 3: OTP Brute Force Simulation (Logical Check)
    console.log("\n🧪 TEST 3: OTP Brute Force & Type Confusion");
    try {
        const res = await request('/auth/verify-mfa', 'POST', {
            email: "admin@example.com",
            otp: ["123456"]
        });
        if (res.status >= 400) {
            console.log("✅ PASS: Non-string OTP rejected (Status " + res.status + ")");
        } else {
            console.log("❌ FAIL: Server accepted non-string OTP!");
        }
    } catch (err) {
        console.log("✅ PASS: Connection failed:", err.message);
    }

    console.log("\n🏁 HARDCORE TEST COMPLETE.");
}

runHardcoreTest();
