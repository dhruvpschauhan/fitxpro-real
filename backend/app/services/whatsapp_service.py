"""
WhatsApp service using Twilio's WhatsApp Business API.
Uses httpx (already in requirements) for HTTP calls — works on all cloud platforms.
"""
import httpx
from app.config import settings


def send_whatsapp(to_phone: str, body: str) -> dict:
    """
    Send a WhatsApp message via Twilio.
    to_phone: E.164 format, e.g. '+919876543210'
    Returns {"success": True} or {"success": False, "error": str}
    """
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    from_number = settings.TWILIO_WHATSAPP_FROM  # e.g. 'whatsapp:+14155238886'

    if not account_sid or not auth_token or not from_number:
        return {
            "success": False,
            "error": "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in Render environment variables."
        }

    # Normalise the to number
    to_phone = to_phone.strip().replace(" ", "").replace("-", "")
    if not to_phone.startswith("+"):
        # Assume Indian number if no country code
        to_phone = "+91" + to_phone.lstrip("0")

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                url,
                auth=(account_sid, auth_token),
                data={
                    "From": from_number,
                    "To": f"whatsapp:{to_phone}",
                    "Body": body,
                },
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                return {"success": True, "sid": data.get("sid")}
            else:
                data = resp.json()
                return {
                    "success": False,
                    "error": data.get("message", f"Twilio error {resp.status_code}")
                }
    except Exception as e:
        return {"success": False, "error": str(e)}
