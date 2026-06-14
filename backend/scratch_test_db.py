import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.email_service import send_email
from app.config import settings

print(f"GMAIL_USER      : {settings.GMAIL_USER}")
print(f"GMAIL_APP_PASS  : {'SET (' + str(len(settings.GMAIL_APP_PASSWORD)) + ' chars)' if settings.GMAIL_APP_PASSWORD else 'NOT SET'}")
print(f"EMAIL_FROM      : {settings.EMAIL_FROM}")
print()

# Send a test email to Bharat
print("Sending test email to peciindia.jaipur@gmail.com ...")
result = send_email(
    to_email="peciindia.jaipur@gmail.com",
    subject="FitX Pro — Test Email",
    html_body="<h1>Test</h1><p>If you can see this, Gmail SMTP is working correctly.</p>"
)

print("Result:", result)
