import { MongoClient } from 'mongodb';
import 'dotenv/config';

const client = new MongoClient(process.env.MONGO_ATLAS_URI as string);

async function startServer() {
  try {
    await client.connect();
      await client.db('admin').command({ ping: 1 });
      console.log('Connected to MongoDB 🖲️');
  } catch (error) {
      console.error("Error connecting to MongoDB 😡", error);
      process.exit(1);
  }
}

startServer();