module.exports = function staffInvitationEmail(name, invitationLink) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
        </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f5f6fa;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
                <td style="padding: 40px 20px;">
                    <table align="center" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.05);">
                        <tr>
                            <td style="padding: 40px 40px 20px; text-align: center;">
                                <img src="https://i.ibb.co/j9T0t9SC/Logo.png" alt="Company Logo" width="48" style="height: auto; display: block; margin: 0 auto 16px;">
                                <h1 style="color: #2d3436; margin: 0; font-size: 24px;">Staff Invitation</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 40px;">
                                <p style="color: #636e72; line-height: 1.6; margin: 0 0 24px;">Hi ${name},</p>
                                <p style="color: #636e72; line-height: 1.6; margin: 0 0 24px;">You've been invited to join the Rentify team as a staff member! We're excited to have you on board.</p>
                                <p style="color: #636e72; line-height: 1.6; margin: 0 0 24px;">To accept your invitation and set up your account, simply click the button below:</p>
                                <div style="text-align: center; margin: 0 0 32px;">
                                    <a href="${invitationLink}" style="background: #0984e3; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Accept Invitation</a>
                                </div>
                                <p style="color: #636e72; line-height: 1.6; margin: 0 0 24px;">
                                    If you didn't expect this invitation or believe it's a mistake, please ignore this email.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 32px 40px; background: #f8f9fa; border-radius: 0 0 16px 16px;">
                                <p style="color: #636e72; font-size: 12px; line-height: 1.6; margin: 0;">
                                    Need help? Contact our support team at 
                                    <a href="mailto:rentify.solution@gmail.com" style="color: #0984e3; text-decoration: none;">rentify.solution@gmail.com</a>
                                    <br>
                                    © ${new Date().getFullYear()} Rentify. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;
};