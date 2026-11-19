const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_hospital_db';

  try {
    // Attempt standard connection first with a brief timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] Connected to external MongoDB successfully: ${mongoose.connection.host}`);
  } catch (err) {
    console.log(`[Database] Local MongoDB server not reachable at ${uri} (${err.message}).`);
    console.log(`[Database] Spinning up high-performance embedded MongoDB engine...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'smart_hospital_db',
        },
      });
      const memoryUri = mongodInstance.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to Embedded MongoDB instance successfully at ${memoryUri}`);
    } catch (memErr) {
      console.error('[Database] Critical: Failed to launch embedded database:', memErr.message);
      process.exit(1);
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] Mongoose disconnected.');
  });
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
