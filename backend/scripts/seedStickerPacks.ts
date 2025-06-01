import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../src/config/database';
import StickerPack from '../src/models/StickerPack';
import Sticker from '../src/models/Sticker';
import User from '../src/models/User';
import { StickerCategory } from '../src/types/sticker.types';

// Load environment variables
dotenv.config();

const seedStickerPacks = async () => {
  try {
    await connectDB();
    console.log('🗄️  Connected to MongoDB');

    // Find or create a system user for default packs
    let systemUser = await User.findOne({ email: 'system@zaloclone.com' });
    if (!systemUser) {
      systemUser = new User({
        firstName: 'ZaloClone',
        lastName: 'System',
        email: 'system@zaloclone.com',
        password: 'system123', // This will be hashed by the model
        status: 'online'
      });
      await systemUser.save();
      console.log('✅ Created system user');
    }

    // Clear existing default packs
    await StickerPack.deleteMany({ isDefault: true });
    await Sticker.deleteMany({});
    console.log('🗑️  Cleared existing sticker data');

    // Create default sticker packs
    const defaultPacks = [
      {
        name: 'Basic Emotions',
        description: 'Express your feelings with these basic emotion stickers',
        category: StickerCategory.EMOTIONS,
        thumbnailUrl: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f600.png',
        stickers: [
          {
            name: 'Happy',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f600.png',
            order: 1,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Love',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f60d.png',
            order: 2,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Laughing',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f602.png',
            order: 3,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Sad',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f622.png',
            order: 4,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Angry',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f621.png',
            order: 5,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Surprised',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f632.png',
            order: 6,
            dimensions: { width: 128, height: 128 }
          }
        ]
      },
      {
        name: 'Reactions',
        description: 'Perfect reactions for any situation',
        category: StickerCategory.REACTIONS,
        thumbnailUrl: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44d.png',
        stickers: [
          {
            name: 'Thumbs Up',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f44d.png',
            order: 1,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Thumbs Down',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f44e.png',
            order: 2,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Clapping',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f44f.png',
            order: 3,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'OK Hand',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f44c.png',
            order: 4,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Victory',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/270c.png',
            order: 5,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Fire',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f525.png',
            order: 6,
            dimensions: { width: 128, height: 128 }
          }
        ]
      },
      {
        name: 'Animals',
        description: 'Cute animal stickers for fun conversations',
        category: StickerCategory.ANIMALS,
        thumbnailUrl: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f436.png',
        stickers: [
          {
            name: 'Dog',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f436.png',
            order: 1,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Cat',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f431.png',
            order: 2,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Panda',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f43c.png',
            order: 3,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Lion',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f981.png',
            order: 4,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Monkey',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f435.png',
            order: 5,
            dimensions: { width: 128, height: 128 }
          },
          {
            name: 'Unicorn',
            url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128x128/1f984.png',
            order: 6,
            dimensions: { width: 128, height: 128 }
          }
        ]
      }
    ];

    // Create sticker packs
    for (const packData of defaultPacks) {
      const pack = new StickerPack({
        name: packData.name,
        description: packData.description,
        author: systemUser._id,
        category: packData.category,
        thumbnailUrl: packData.thumbnailUrl,
        price: 0,
        isDefault: true,
        isPublic: true,
        downloadCount: 0
      });

      const savedPack = await pack.save();
      console.log(`✅ Created sticker pack: ${pack.name}`);

      // Create stickers for this pack
      for (const stickerData of packData.stickers) {
        const sticker = new Sticker({
          name: stickerData.name,
          url: stickerData.url,
          packId: savedPack._id,
          order: stickerData.order,
          isAnimated: false,
          dimensions: stickerData.dimensions
        });

        await sticker.save();
        console.log(`  ➡️  Added sticker: ${sticker.name}`);
      }
    }

    console.log('🎉 Sticker packs seeded successfully!');
    console.log(`📦 Created ${defaultPacks.length} default sticker packs`);
    console.log(`🎨 Created ${defaultPacks.reduce((sum, pack) => sum + pack.stickers.length, 0)} stickers`);

  } catch (error) {
    console.error('❌ Error seeding sticker packs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
};

// Run the seed script
seedStickerPacks();