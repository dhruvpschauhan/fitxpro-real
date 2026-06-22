"""
Email service using Gmail SMTP with App Password.
Sends real emails from dhruvpratapsinghchauhan9@gmail.com.
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from app.config import settings


def send_email(to_email: str, subject: str, html_body: str) -> dict:
    """
    Send an HTML email via Gmail SMTP.
    Returns {"success": True} or {"success": False, "error": str}
    """
    gmail_user = settings.GMAIL_USER
    gmail_password = settings.GMAIL_APP_PASSWORD

    if not gmail_user or not gmail_password:
        return {
            "success": False,
            "error": "Gmail SMTP not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env"
        }

    # Build the message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr(("FitX Pro", gmail_user))
    msg["To"] = to_email

    # Attach HTML part
    part = MIMEText(html_body, "html", "utf-8")
    msg.attach(part)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls(context=context)
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, to_email, msg.as_string())
        return {"success": True}
    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "error": "Gmail authentication failed. Check your App Password in .env (GMAIL_APP_PASSWORD)."
        }
    except smtplib.SMTPException as e:
        return {"success": False, "error": f"SMTP error: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
