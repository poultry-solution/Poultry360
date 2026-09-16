const SMS_PASAL_ENDPOINT = "https://sms.smspasal.com/smsapi/index.php";

function getSmsPasalConfig() {
  const apiKey = process.env.SMS_PASAL_API_KEY;
  const senderId = process.env.SMS_PASAL_SENDER_ID;

  if (!apiKey || !senderId) {
    throw new Error("SMS Pasal is not configured");
  }

  return {
    apiKey,
    senderId,
    campaign: process.env.SMS_PASAL_CAMPAIGN || "9780",
    routeId: process.env.SMS_PASAL_ROUTE_ID || "10259",
  };
}

/** Sends a password-reset OTP through SMS Pasal. The provider expects local Nepal numbers. */
export async function sendPasswordResetOtpSms(phone: string, otp: string): Promise<void> {
  const { apiKey, senderId, campaign, routeId } = getSmsPasalConfig();
  const contacts = phone.replace(/^\+977/, "");
  const message = `Your Poultry360 password reset code is ${otp}. It expires in 10 minutes. Do not share this code.`;
  const body = new URLSearchParams({
    key: apiKey,
    campaign,
    routeid: routeId,
    type: "text",
    responsetype: "http",
    contacts,
    senderid: senderId,
    msg: message,
  });

  let response: Response;
  try {
    response = await fetch(SMS_PASAL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("SMS Pasal request failed", error);
    throw new Error("SMS provider could not be reached");
  }

  const responseText = (await response.text()).trim();
  if (!response.ok || !responseText.startsWith("SMS-SHOOT-ID/")) {
    // Do not log the request body: it contains the API key and OTP.
    console.error("SMS Pasal rejected password-reset SMS", {
      status: response.status,
      response: responseText.slice(0, 300),
    });
    throw new Error("SMS provider rejected the message");
  }
}
