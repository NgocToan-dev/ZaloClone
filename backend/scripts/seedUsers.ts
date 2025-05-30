import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User';
import { UserStatus } from '../src/types/user.types';

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zaloclone';

// Sample users data
interface SampleUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status: UserStatus;
}

const sampleUsers: SampleUser[] = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    status: UserStatus.ONLINE
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    status: UserStatus.AWAY
  },
  {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@example.com',
    password: 'password123',
    status: UserStatus.BUSY
  },
  {
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'sarah.wilson@example.com',
    password: 'password123',
    status: UserStatus.OFFLINE
  },
  {
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@example.com',
    password: 'password123',
    status: UserStatus.ONLINE
  },
  {
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@example.com',
    password: 'password123',
    status: UserStatus.AWAY
  },
  {
    firstName: 'Chris',
    lastName: 'Miller',
    email: 'chris.miller@example.com',
    password: 'password123',
    status: UserStatus.ONLINE
  },
  {
    firstName: 'Lisa',
    lastName: 'Garcia',
    email: 'lisa.garcia@example.com',
    password: 'password123',
    status: UserStatus.OFFLINE
  }
];

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

// Clear existing users
const clearUsers = async (): Promise<void> => {
  try {
    const deleteResult = await User.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing users`);
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    throw error;
  }
};

// Create users
const createUsers = async (): Promise<any[]> => {
  try {
    console.log('📝 Creating sample users...');
    
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.fullName} (${user.email})`);
    }
    
    console.log(`\n🎉 Successfully created ${createdUsers.length} users!`);
    return createdUsers;
  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  }
};

// Add some contacts between users
const addContacts = async (users: any[]): Promise<void> => {
  try {
    console.log('\n👥 Adding sample contacts...');
    
    // John và Jane là bạn
    users[0].contacts.push(users[1]._id);
    users[1].contacts.push(users[0]._id);
    await users[0].save();
    await users[1].save();
    console.log(`✅ Added contact: ${users[0].fullName} ↔ ${users[1].fullName}`);
    
    // Mike và Sarah là bạn
    users[2].contacts.push(users[3]._id);
    users[3].contacts.push(users[2]._id);
    await users[2].save();
    await users[3].save();
    console.log(`✅ Added contact: ${users[2].fullName} ↔ ${users[3].fullName}`);
    
    // David có nhiều bạn
    users[4].contacts.push(users[0]._id, users[5]._id, users[6]._id);
    users[0].contacts.push(users[4]._id);
    users[5].contacts.push(users[4]._id);
    users[6].contacts.push(users[4]._id);
    await users[4].save();
    await users[0].save();
    await users[5].save();
    await users[6].save();
    console.log(`✅ Added contacts for ${users[4].fullName}`);
    
    console.log('👥 Sample contacts added successfully!');
  } catch (error) {
    console.error('❌ Error adding contacts:', error);
    throw error;
  }
};

// Main seed function
const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🚀 Starting database seeding...\n');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    await clearUsers();
    
    // Create new users
    const users = await createUsers();
    
    // Add sample contacts
    await addContacts(users);
    
    console.log('\n✨ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users created: ${users.length}`);
    console.log(`   Sample contacts added: Yes`);
    console.log(`   Database: ${MONGODB_URI}`);
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export {
  seedDatabase,
  connectDB,
  clearUsers,
  createUsers,
  sampleUsers
};