import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { NetworkModel } from '../models/network.model';
import { PackModel } from '../models/pack.model';
import { AnnouncementModel } from '../models/announcement.model';
import { UserRole, UserStatus } from '../types';
import { logger } from '../utils/logger';

export const seedDatabase = async () => {
  try {
    await connectDatabase();
    logger.info('🌱 Starting database seed...');

    // 1. Seed Admin User
    const existingAdmin = await UserModel.findOne({ username: env.ADMIN_USERNAME.toLowerCase() });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);

      await UserModel.create({
        username: env.ADMIN_USERNAME.toLowerCase(),
        fullName: env.ADMIN_FULL_NAME,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        balance: 1000.0 // Initial admin balance pool
      });
      logger.info(`✅ Admin created with username: ${env.ADMIN_USERNAME}`);
    } else {
      logger.info('ℹ️ Admin already exists.');
    }

    // 2. Seed Networks
    const networksData = [
      {
        name: 'Tunisie Telecom',
        code: 'TT',
        logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcjAL9itCcYdAhLn5lm1jzsMtQMT75EzG3yMOCHB3MDw1vYaQ_yhivDm8&s=10',
        brandColor: '#005BBB',
        isActive: true
      },
      {
        name: 'Orange Tunisie',
        code: 'ORANGE',
        logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZinnmva8-lJ1z37ULNDrM8XNNp4GJt91xerwCjyJLPCv2Cn__dTiBxlw&s=10',
        brandColor: '#FF6600',
        isActive: true
      },
      {
        name: 'Ooredoo Tunisie',
        code: 'OOREDOO',
        logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGjspdidXrxDL1M4N9LBH0TgN2767EM1bi3zdTsgXSwOskgzyB91DMq2M&s=10',
        brandColor: '#ED1C24',
        isActive: true
      }
    ];

    const seededNetworks: Record<string, string> = {};

    for (const net of networksData) {
      let network = await NetworkModel.findOne({ code: net.code });
      if (!network) {
        network = await NetworkModel.create(net);
        logger.info(`✅ Network created: ${net.name} (${net.code})`);
      } else {
        logger.info(`ℹ️ Network exists: ${net.name}`);
      }
      seededNetworks[net.code] = network._id.toString();
    }

    // 3. Seed Packs for each network
    const standardPacks = [
      {
        name: 'باقة التوفير 10 Go',
        dataAmount: '10 Go',
        price: 10.0,
        description: 'باقة إنترنت سريعة صالحة لمدة 30 يوماً لجميع الاستخدامات'
      },
      {
        name: 'باقة التميز 25 Go',
        dataAmount: '25 Go',
        price: 20.0,
        description: 'باقة مثالية للألعاب، المشاهدة، وتصفح الإنترنت فائق السرعة 4G/5G'
      },
      {
        name: 'باقة الأعمال 50 Go',
        dataAmount: '50 Go',
        price: 30.0,
        description: 'أكبر حجم بيانات للاستهلاك العالي وسرعات فائقة مستمرة بدون انقطاع'
      }
    ];

    for (const [code, networkId] of Object.entries(seededNetworks)) {
      for (const pack of standardPacks) {
        const existingPack = await PackModel.findOne({ networkId, dataAmount: pack.dataAmount });
        if (!existingPack) {
          await PackModel.create({
            networkId,
            name: `${pack.name} - ${code}`,
            dataAmount: pack.dataAmount,
            price: pack.price,
            description: pack.description,
            isActive: true
          });
          logger.info(`✅ Pack created: ${pack.dataAmount} for ${code}`);
        }
      }
    }

    // 4. Seed Welcome Announcement
    const existingAnnouncement = await AnnouncementModel.findOne();
    if (!existingAnnouncement) {
      await AnnouncementModel.create({
        title: 'مرحباً بكم في تطبيق Khazrouni Giga',
        message: 'مركز الإنترنت الشامل: شحن فوري للباقات بأفضل الأسعار لجميع الشبكات التونسية (TT, Orange, Ooredoo).',
        isActive: true
      });
      logger.info('✅ Initial announcement created');
    }

    logger.info('🎉 Seed completed successfully!');
  } catch (error) {
    logger.error({ error }, '❌ Seed error');
    throw error;
  } finally {
    await disconnectDatabase();
  }
};

if (require.main === module) {
  seedDatabase().catch(() => process.exit(1));
}
