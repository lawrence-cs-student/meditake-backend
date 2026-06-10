import { Expo, ExpoPushMessage, ExpoPushReceipt } from 'expo-server-sdk';
import { logger } from './pino';

const expo = new Expo();

export const sendPushNotification = async (
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: any }> => {
  // 1. Validate the Expo push token
  if (!Expo.isExpoPushToken(pushToken)) {
    logger.error({ pushToken }, 'Invalid Expo push token');
    return { success: false, error: 'Invalid Expo push token' };
  }

  // 2. Build the message
  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  try {
    // 3. Send the notification
    const chunks = expo.chunkPushNotifications([message]);
    const receipts: ExpoPushReceipt[] = [];

    for (const chunk of chunks) {
      const chunkReceipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.push(...chunkReceipts);
    }

    // 4. Check for errors in receipts (optional – can be handled later)
    const receipt = receipts[0];
    if (receipt?.status === 'error') {
      logger.error({ receipt }, 'Expo push receipt error');
      return { success: false, error: receipt.message };
    }

    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Expo push send failed');
    return { success: false, error };
  }
};