"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const user_model_1 = require("../models/user.model");
const network_model_1 = require("../models/network.model");
const pack_model_1 = require("../models/pack.model");
const announcement_model_1 = require("../models/announcement.model");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const seedDatabase = async () => {
    try {
        await (0, database_1.connectDatabase)();
        logger_1.logger.info('🌱 Starting database seed...');
        // 1. Seed Admin User
        const existingAdmin = await user_model_1.UserModel.findOne({ username: env_1.env.ADMIN_USERNAME.toLowerCase() });
        if (!existingAdmin) {
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(env_1.env.ADMIN_PASSWORD, salt);
            await user_model_1.UserModel.create({
                username: env_1.env.ADMIN_USERNAME.toLowerCase(),
                fullName: env_1.env.ADMIN_FULL_NAME,
                passwordHash,
                role: types_1.UserRole.ADMIN,
                status: types_1.UserStatus.ACTIVE,
                balance: 1000.0 // Initial admin balance pool
            });
            logger_1.logger.info(`✅ Admin created with username: ${env_1.env.ADMIN_USERNAME}`);
        }
        else {
            logger_1.logger.info('ℹ️ Admin already exists.');
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
        const seededNetworks = {};
        for (const net of networksData) {
            let network = await network_model_1.NetworkModel.findOne({ code: net.code });
            if (!network) {
                network = await network_model_1.NetworkModel.create(net);
                logger_1.logger.info(`✅ Network created: ${net.name} (${net.code})`);
            }
            else {
                logger_1.logger.info(`ℹ️ Network exists: ${net.name}`);
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
                const existingPack = await pack_model_1.PackModel.findOne({ networkId, dataAmount: pack.dataAmount });
                if (!existingPack) {
                    await pack_model_1.PackModel.create({
                        networkId,
                        name: `${pack.name} - ${code}`,
                        dataAmount: pack.dataAmount,
                        price: pack.price,
                        description: pack.description,
                        isActive: true
                    });
                    logger_1.logger.info(`✅ Pack created: ${pack.dataAmount} for ${code}`);
                }
            }
        }
        // 4. Seed Welcome Announcement
        const existingAnnouncement = await announcement_model_1.AnnouncementModel.findOne();
        if (!existingAnnouncement) {
            await announcement_model_1.AnnouncementModel.create({
                title: 'مرحباً بكم في تطبيق Khazrouni Giga',
                message: 'مركز الإنترنت الشامل: شحن فوري للباقات بأفضل الأسعار لجميع الشبكات التونسية (TT, Orange, Ooredoo).',
                isActive: true
            });
            logger_1.logger.info('✅ Initial announcement created');
        }
        logger_1.logger.info('🎉 Seed completed successfully!');
    }
    catch (error) {
        logger_1.logger.error({ error }, '❌ Seed error');
        throw error;
    }
    finally {
        await (0, database_1.disconnectDatabase)();
    }
};
exports.seedDatabase = seedDatabase;
if (require.main === module) {
    (0, exports.seedDatabase)().catch(() => process.exit(1));
}
