from app.config import settings

def get_base_html(body_content: str) -> str:
    gym_name = settings.GYM_NAME
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                background-color: #0f0f0f;
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
            }}
            .container {{
                max-width: 560px;
                margin: 40px auto;
                background-color: #111111;
                border: 1px solid #1e1e1e;
            }}
            .header {{
                background-color: #E8001D;
                padding: 24px;
                text-align: center;
            }}
            .header h1 {{
                color: #ffffff;
                margin: 0;
                text-transform: uppercase;
                font-size: 24px;
                letter-spacing: 2px;
            }}
            .body {{
                padding: 32px;
                color: #E2E8F0;
                line-height: 1.6;
                font-size: 16px;
            }}
            .footer {{
                padding: 24px;
                text-align: center;
                color: #555555;
                font-size: 12px;
                border-top: 1px solid #1e1e1e;
            }}
            .cta-button {{
                display: inline-block;
                background-color: #E8001D;
                color: #ffffff !important;
                padding: 12px 28px;
                text-decoration: none;
                font-weight: bold;
                margin-top: 24px;
                margin-bottom: 24px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{gym_name}</h1>
            </div>
            <div class="body">
                {body_content}
            </div>
            <div class="footer">
                &copy; 2026 {gym_name}. All rights reserved.<br>
                This is an automated message, please do not reply directly.
            </div>
        </div>
    </body>
    </html>
    """

def get_email_template(trigger_reason: str, data: dict) -> dict:
    gym_name = settings.GYM_NAME
    full_name = data.get("full_name", "")
    plan_name = data.get("plan_name", "")
    expiry_date = data.get("expiry_date", "")

    if trigger_reason == "7_day_expiry":
        subject = f"{gym_name} — Your membership expires in 7 days"
        body = f"""
        <p>Hi {full_name},</p>
        <p>Your <strong>{plan_name}</strong> membership at {gym_name} is expiring on <strong>{expiry_date}</strong>.</p>
        <p>You have 7 days remaining. Renew now to keep your progress going without interruption.</p>
        <a href="tel:0000000000" class="cta-button">RENEW NOW</a>
        <p>If you have already renewed, please ignore this message.</p>
        <p>— {gym_name} Team</p>
        """
    elif trigger_reason == "3_day_expiry":
        subject = f"{gym_name} — 3 days left on your membership"
        body = f"""
        <p>Hi {full_name},</p>
        <p>Just a reminder — your <strong>{plan_name}</strong> membership expires in 3 days on <strong>{expiry_date}</strong>.</p>
        <p>Renew before it expires to avoid any break in access.</p>
        <a href="tel:0000000000" class="cta-button">RENEW NOW</a>
        <p>— {gym_name} Team</p>
        """
    elif trigger_reason == "1_day_expiry":
        subject = f"{gym_name} — Your membership expires tomorrow"
        body = f"""
        <p>Hi {full_name},</p>
        <p>Your <strong>{plan_name}</strong> membership at {gym_name} expires tomorrow on <strong>{expiry_date}</strong>.</p>
        <p>Renew today to continue without interruption.</p>
        <a href="tel:0000000000" class="cta-button">RENEW NOW</a>
        <p>— {gym_name} Team</p>
        """
    elif trigger_reason == "expired":
        subject = f"{gym_name} — Your membership has expired"
        body = f"""
        <p>Hi {full_name},</p>
        <p>Your <strong>{plan_name}</strong> membership at {gym_name} expired on <strong>{expiry_date}</strong>.</p>
        <p>Renew your membership to regain full access.</p>
        <a href="tel:0000000000" class="cta-button">RENEW NOW</a>
        <p>— {gym_name} Team</p>
        """
    elif trigger_reason == "manual":
        subject = f"{gym_name} — Membership renewal reminder"
        body = f"""
        <p>Hi {full_name},</p>
        <p>This is a reminder that your <strong>{plan_name}</strong> membership at {gym_name}
        expires on / expired on <strong>{expiry_date}</strong>.</p>
        <p>Please contact us to renew your membership.</p>
        <a href="tel:0000000000" class="cta-button">RENEW NOW</a>
        <p>— {gym_name} Team</p>
        """
    else:
        subject = f"{gym_name} — Alert"
        body = f"<p>Hi {full_name},</p><p>You have a new alert.</p>"

    return {
        "subject": subject,
        "html": get_base_html(body)
    }
