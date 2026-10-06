"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcmEmitter = void 0;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const user_model_1 = require("../models/user.model");
const types_1 = require("../types");
let app = null;
function initFirebase() {
    if (app || !env_1.env.FIREBASE_CREDENTIALS_JSON)
        return;
    try {
        const serviceAccount = JSON.parse(env_1.env.FIREBASE_CREDENTIALS_JSON);
        // Avoid re-initializing if already done (e.g. hot reload)
        app = (0, app_1.getApps)().length === 0
            ? (0, app_1.initializeApp)({ credential: (0, app_1.cert)(serviceAccount) })
            : (0, app_1.getApps)()[0];
        logger_1.logger.info('Firebase Admin SDK initialized');
    }
    catch (err) {
        logger_1.logger.warn({ err }, 'Firebase Admin SDK initialization failed — FCM push notifications disabled');
    }
}
initFirebase();
// ─── Low-level sender ───────────────────────────────────────────────────────
async function sendToToken(token, title, body, data) {
    if (!app || !token)
        return;
    try {
        await (0, messaging_1.getMessaging)(app).send({
            token,
            notification: { title, body },
            data: data || {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'khazrouni_channel',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        });
        logger_1.logger.info({ token: token.slice(0, 15) + '...', title }, 'FCM notification sent successfully');
    }
    catch (err) {
        if (err?.errorInfo?.code !== 'messaging/registration-token-not-registered') {
            logger_1.logger.warn({ error: err?.message }, `FCM sendToToken failed for token ${token.slice(0, 20)}...`);
        }
    }
}
// ─── High-level emitter (mirrors SocketEmitter API) ─────────────────────────
class FcmEmitter {
    /**
     * Send a push notification to a specific user by their DB user ID.
     * Non-blocking — errors are silently logged.
     */
    static async emitToUser(userId, title, body, data) {
        if (!app)
            return;
        try {
            const user = await user_model_1.UserModel.findById(userId).select('fcmToken').lean();
            if (user?.fcmToken) {
                await sendToToken(user.fcmToken, title, body, data);
            }
        }
        catch (err) {
            logger_1.logger.warn({ error: err?.message }, 'FcmEmitter.emitToUser failed');
        }
    }
    /**
     * Send a push notification to all admins.
     * Useful for notifying admins of new orders even when their app is closed.
     */
    static async emitToAdmins(title, body, data) {
        if (!app)
            return;
        try {
            const admins = await user_model_1.UserModel.find({
                role: types_1.UserRole.ADMIN,
                fcmToken: { $exists: true, $nin: [null, ''] }
            }).select('fcmToken username').lean();
            logger_1.logger.info({ adminCount: admins.length }, 'Sending FCM push notification to admins');
            const tokens = admins.map((a) => a.fcmToken).filter(Boolean);
            await Promise.allSettled(tokens.map((t) => sendToToken(t, title, body, data)));
        }
        catch (err) {
            logger_1.logger.warn({ error: err?.message }, 'FcmEmitter.emitToAdmins failed');
        }
    }
}
exports.FcmEmitter = FcmEmitter;
