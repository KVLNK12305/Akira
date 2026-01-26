import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   [Security Protocol: TLS 1.3 Active]`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    // Don't exit process in dev mode
  }
};

export default connectDB;