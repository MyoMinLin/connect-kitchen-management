import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kitchen_management';

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside .env.local');
}

let cachedConnection: typeof mongoose | null = null;

async function dbConnect() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const opts = {
    bufferCommands: false,
  };

  cachedConnection = await mongoose.connect(MONGO_URI, opts);

  return cachedConnection;
}

export default dbConnect;
