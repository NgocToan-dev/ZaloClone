import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User';

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zaloclone';

// Connect to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Create database indexes for better performance
const createIndexes = async (): Promise<void> => {
  try {
    console.log('🔍 Creating database indexes...\n');

    // Email index (unique)
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ Created unique index on email field');

    // Status index for filtering online users
    await User.collection.createIndex({ status: 1 });
    console.log('✅ Created index on status field');

    // Text search index for user search functionality
    await User.collection.createIndex({
      firstName: 'text',
      lastName: 'text',
      email: 'text'
    }, {
      name: 'user_search_index',
      weights: {
        firstName: 10,
        lastName: 10,
        email: 5
      }
    });
    console.log('✅ Created text search index for user search');

    // Compound index for status + lastSeen (for active users queries)
    await User.collection.createIndex({ status: 1, lastSeen: -1 });
    console.log('✅ Created compound index on status + lastSeen');

    // LastSeen index for sorting by activity
    await User.collection.createIndex({ lastSeen: -1 });
    console.log('✅ Created index on lastSeen field');

    // CreatedAt index
    await User.collection.createIndex({ createdAt: -1 });
    console.log('✅ Created index on createdAt field');

    console.log('\n🎉 All indexes created successfully!');

    // Show current indexes
    const indexes = await User.collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};

// Drop all indexes (for reset)
const dropIndexes = async (): Promise<void> => {
  try {
    console.log('🗑️  Dropping all indexes except _id...');
    await User.collection.dropIndexes();
    console.log('✅ All indexes dropped successfully!');
  } catch (error) {
    console.error('❌ Error dropping indexes:', error);
    throw error;
  }
};

// Main function
const setupIndexes = async (): Promise<void> => {
  try {
    console.log('🚀 Setting up database indexes...\n');
    
    // Connect to database
    await connectDB();
    
    // Create indexes
    await createIndexes();
    
    console.log('\n✨ Index setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Index setup failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Export functions
export {
  setupIndexes,
  createIndexes,
  dropIndexes,
  connectDB
};

// Run if this file is executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'drop') {
    // Run: node createIndexes.js drop
    (async () => {
      await connectDB();
      await dropIndexes();
      await mongoose.connection.close();
      process.exit(0);
    })();
  } else {
    // Run: node createIndexes.js
    setupIndexes();
  }
}