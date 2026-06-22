"""
Email service using Resend HTTP API.
Works on all cloud platforms (no SMTP ports needed).
Sends from your verified Resend domain/email.
"""
import urllib.request
import urllib.error
import json
from app.config import settings


def send_email(to_email: str, subject: str, html_body: str) -> dict:
    """
    Send an HTML email via Resend API (HTTP POST — works on all cloud hosts).
    Returns {"success": True} or {"success": False, "error": str}
    """
    api_key = settings.RESEND_API_KEY

    if not api_key or api_key == "re_stub":
        return {
            "success": False,
            "error": "Resend API key not configured. Set RESEND_API_KEY in Render environment variables."
        }

    payload = json.dumps({
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode())
            return {"success": True, "id": body.get("id")}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        return {"success": False, "error": f"Resend HTTP {e.code}: {error_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
