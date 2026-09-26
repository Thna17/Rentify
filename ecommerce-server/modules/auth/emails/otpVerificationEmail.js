module.exports = function otpVerificationEmail(otp) {
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
                                <h1 style="color: #2d3436; margin: 0; font-size: 24px;">Verify Your Email</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 40px;">
                                <p style="color: #636e72; line-height: 1.6; margin: 0 0 24px;">Hi there,</p>
                                <p style="color: #636e72; line-height: 1.6; margin: 0 0 24px;">Thank you for registering with Rentify! Please use the following OTP to verify your email address:</p>
                                <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; text-align: center; margin: 0 0 32px;">
                                    <div style="font-size: 32px; font-weight: 600; letter-spacing: 2px; color: #2d3436; margin: 0;">${otp}</div>
                                    <div style="color: #636e72; font-size: 14px; margin-top: 8px;">Valid for 10 minutes</div>
                                </div>
                                <p style="color: #636e72; line-height: 1.6; margin: 0 0 24px;">
                                    Simply enter this code in the verification screen to complete your registration. If you didn't request this code, please ignore this email.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 32px 40px; background: #f8f9fa; border-radius: 0 0 16px 16px;">
                                <p style="color: #636e72; font-size: 12px; line-height: 1.6; margin: 0;">
                                    Need help? Contact our support team at 
                                    <a href="rentify.solution@gmail.com" style="color: #0984e3; text-decoration: none;">rentify.solution@gmail.com</a>
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
