export function getWhatsAppConfig() {
  const provider = process.env.WHATSAPP_PROVIDER || 'green_api';
  const instanceId = process.env.WHATSAPP_INSTANCE_ID || '';
  const apiToken = process.env.WHATSAPP_API_TOKEN || '';
  const targetNumber = process.env.WHATSAPP_TARGET_NUMBER || '';

  const isConfigured = Boolean(instanceId && apiToken && targetNumber && !instanceId.includes('1101'));
  return { provider, instanceId, apiToken, targetNumber, isConfigured };
}

/**
 * Format markdown/HTML text into clean WhatsApp styling (*bold*, _italic_, ~strike~)
 */
export function formatForWhatsApp(text: string): string {
  return text
    .replace(/<b>(.*?)<\/b>/gi, '*$1*')
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '_$1_')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]*>?/gm, '');
}

/**
 * Send WhatsApp Message via configured provider (Green-API / Twilio / Custom Webhook)
 */
export async function sendWhatsAppMessage(text: string, customTarget?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getWhatsAppConfig();
  const target = customTarget || config.targetNumber;

  if (!config.instanceId || !config.apiToken || !target) {
    return {
      success: false,
      error: 'بيانات WhatsApp غير مكتملة في .env.local',
    };
  }

  const formattedText = formatForWhatsApp(text);

  try {
    // Strategy 1: Green-API (https://green-api.com)
    if (config.provider === 'green_api') {
      // Ensure target format: 213xxxxxxxxx@c.us or group @g.us
      const chatId = target.includes('@') 
        ? target 
        : `${target.replace(/[^0-9]/g, '')}@c.us`;

      const url = `https://api.green-api.com/waInstance${config.instanceId}/sendMessage/${config.apiToken}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatId,
          message: formattedText,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Green-API error (${response.status}): ${err}`);
      }

      const resData = await response.json();
      return { success: true, messageId: resData.idMessage };
    }

    // Strategy 2: Twilio WhatsApp (if provider is twilio)
    if (config.provider === 'twilio') {
      const accountSid = config.instanceId;
      const authToken = config.apiToken;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const body = new URLSearchParams({
        From: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        To: `whatsapp:${target.startsWith('+') ? target : '+' + target}`,
        Body: formattedText,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Twilio error (${response.status}): ${err}`);
      }

      const resData = await response.json();
      return { success: true, messageId: resData.sid };
    }

    return { success: false, error: `Unsupported provider: ${config.provider}` };
  } catch (err: any) {
    console.error('WhatsApp dispatch error:', err);
    return { success: false, error: err.message || 'Unknown WhatsApp Error' };
  }
}

/**
 * Test WhatsApp Connectivity
 */
export async function testWhatsAppConnection() {
  const config = getWhatsAppConfig();

  if (!config.isConfigured) {
    return {
      connected: false,
      message: 'بيانات WhatsApp غير مكتملة في .env.local (Instance ID / Token / Target Number)',
    };
  }

  try {
    const testMsg = `*🤖 اختبار منصة AI News Pulse*\n\n✅ تم التحقق من ربط إشعارات WhatsApp بنجاح!\n📅 ${new Date().toLocaleString('ar-SA')}`;
    const result = await sendWhatsAppMessage(testMsg);

    if (!result.success) {
      return {
        connected: false,
        message: `فشل إرسال رسالة الاختبار إلى WhatsApp: ${result.error}`,
      };
    }

    return {
      connected: true,
      message: `تم إرسال رسالة اختبار WhatsApp بنجاح إلى ${config.targetNumber}!`,
      messageId: result.messageId,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `خطأ في اختبار WhatsApp: ${err.message}`,
    };
  }
}
