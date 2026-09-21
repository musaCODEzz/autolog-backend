import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Ensure predictable JWT secret & environment in test runs
process.env.JWT_SECRET = 'test_jwt_secret_key_for_automated_testing_1234567890';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV = 'test';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Spin up isolated, super-fast in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
});


afterAll(async () => {
  // Tear down in-memory DB and close connections cleanly
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
});
