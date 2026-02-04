
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

async function test() {
    await mongoose.connect('mongodb://localhost:27017/test_db');
    await User.deleteMany({});
    await User.create({ email: 'admin@example.com' });

    const injection = { "$gt": "" };
    const found = await User.findOne({ email: injection });
    console.log('Found with injection:', found);

    await mongoose.disconnect();
}

// test(); // Uncomment to run if mongo is available
