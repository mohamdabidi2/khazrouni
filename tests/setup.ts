import mongoose from 'mongoose';

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/khazrouni_giga_test?directConnection=true';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  }
});

beforeEach(async () => {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});
