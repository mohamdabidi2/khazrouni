import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { UserModel } from '../models/user.model';
import { UserRole } from '../types';

let app: App | null = null;

function initFirebase() {
  if (app || !env.FIREBASE_CREDENTIALS_JSON) return;
  try {
    const serviceAccount = JSON.parse(env.FIREBASE_CREDENTIALS_JSON);
    // Avoid re-initializing if already done (e.g. hot reload)
    app = getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];
    logger.info('Firebase Admin SDK initialized');
  } catch (err) {
    logger.warn({ err }, 'Firebase Admin SDK initialization failed — FCM push notifications disabled');
  }
}

initFirebase();

// ─── Low-level sender ───────────────────────────────────────────────────────

async function sendToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  if (!app || !token) return;
  try {
    await getMessaging(app).send({
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
    logger.info({ token: token.slice(0, 15) + '...', title }, 'FCM notification sent successfully');
  } catch (err: any) {
    if (err?.errorInfo?.code !== 'messaging/registration-token-not-registered') {
      logger.warn({ error: err?.message }, `FCM sendToToken failed for token ${token.slice(0, 20)}...`);
    }
  }
}

// ─── High-level emitter (mirrors SocketEmitter API) ─────────────────────────

export class FcmEmitter {
  /**
   * Send a push notification to a specific user by their DB user ID.
   * Non-blocking — errors are silently logged.
   */
  static async emitToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!app) return;
    try {
      const user = await UserModel.findById(userId).select('fcmToken').lean();
      if (user?.fcmToken) {
        await sendToToken(user.fcmToken, title, body, data);
      }
    } catch (err: any) {
      logger.warn({ error: err?.message }, 'FcmEmitter.emitToUser failed');
    }
  }

  /**
   * Send a push notification to all admins.
   * Useful for notifying admins of new orders even when their app is closed.
   */
  static async emitToAdmins(title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!app) return;
    try {
      const admins = await UserModel.find({
        role: UserRole.ADMIN,
        fcmToken: { $exists: true, $nin: [null, ''] }
      }).select('fcmToken username').lean();
      logger.info({ adminCount: admins.length }, 'Sending FCM push notification to admins');
      const tokens = admins.map((a) => a.fcmToken).filter(Boolean) as string[];
      await Promise.allSettled(tokens.map((t) => sendToToken(t, title, body, data)));
    } catch (err: any) {
      logger.warn({ error: err?.message }, 'FcmEmitter.emitToAdmins failed');
    }
  }
}
