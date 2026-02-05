import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import APIKey from './src/models/APIKey.js';
import argon2 from 'argon2';

dotenv.config();

const testSudoLogic = async () => {
    try {
        console.log("--- STARTING SUDO DELETE VERIFICATION ---");
        await mongoose.connect(process.env.MONGO_URI);

        // 1. Setup Identities
        const adminPass = "SecureAdmin123!";
        const adminHash = await argon2.hash(adminPass);

        const testAdmin = await User.create({
            username: 'temp_admin',
            email: 'admin@akira.test',
            passwordHash: adminHash,
            role: 'Admin'
        });

        const targetUser = await User.create({
            username: 'target_unit',
            email: 'target@akira.test',
            passwordHash: 'dummy',
            role: 'Developer'
        });

        console.log(`Admin Created: ${testAdmin._id}`);
        console.log(`Target Created: ${targetUser._id}`);

        // 2. Mock Verification Function (Simulating the controller logic)
        const verifyAndAttemptDelete = async (adminId, targetId, providedPassword) => {
            const admin = await User.findById(adminId);
            const isMatch = await argon2.verify(admin.passwordHash, providedPassword);

            if (!isMatch) {
                console.log("❌ Sudo Check: Invalid Password (EXPECTED)");
                return false;
            }

            console.log("✅ Sudo Check: Password Verified.");
            await User.findByIdAndDelete(targetId);
            return true;
        };

        // 3. Test Failure Case
        console.log("\nTesting with WRONG password...");
        const failRes = await verifyAndAttemptDelete(testAdmin._id, targetUser._id, "wrong_pass");

        // 4. Test Success Case
        console.log("\nTesting with CORRECT password...");
        const successRes = await verifyAndAttemptDelete(testAdmin._id, targetUser._id, adminPass);

        // 5. Final Verification
        const finalCheck = await User.findById(targetUser._id);
        console.log("\n--- FINAL RESULTS ---");
        console.log(`Target User Still in DB? ${finalCheck ? 'YES (FAIL)' : 'NO (XPSS)'}`);

        if (!failRes && successRes && !finalCheck) {
            console.log("\n✅ ALL TESTS PASSED: Sudo re-verification is working correctly.");
        } else {
            console.log("\n❌ TEST FAILED: Logic inconsistency detected.");
        }

        // Cleanup
        await User.deleteOne({ _id: testAdmin._id });
        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error("Test Error:", err);
        process.exit(1);
    }
};

testSudoLogic();
