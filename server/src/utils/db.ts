import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kitchen_management';

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside .env.local');
}

async function dbConnect() {
  const opts = {
    bufferCommands: false,
  };

  return mongoose.connect(MONGO_URI, opts);
}

export default dbConnect;
