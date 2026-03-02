const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const getWelcomeEmailTemplate = (userName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .welcome-text { font-size: 18px; color: #333; line-height: 1.6; }
        .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-item { padding: 10px 0; color: #555; }
        .feature-item::before { content: "✓ "; color: #667eea; font-weight: bold; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
        .footer { background: #333; color: white; text-align: center; padding: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏡 Welcome to Real Estate Platform!</h1>
        </div>
        <div class="content">
          <p class="welcome-text">Hi <strong>${userName}</strong>,</p>
          <p class="welcome-text">Thank you for joining our Real Estate Platform! We're excited to have you on board. 🎉</p>
          
          <div class="features">
            <h3 style="color: #667eea; margin-top: 0;">What you can do now:</h3>
            <div class="feature-item">Browse thousands of premium properties</div>
            <div class="feature-item">Save your favorite listings</div>
            <div class="feature-item">Book property visits instantly</div>
            <div class="feature-item">Get personalized recommendations</div>
            <div class="feature-item">Connect with verified property owners</div>
          </div>

          <p class="welcome-text">Start exploring amazing properties in your dream location today!</p>
          
          <center>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/properties" class="cta-button">Explore Properties</a>
          </center>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Need help? Our support team is always here for you. Just reply to this email!
          </p>
        </div>
        <div class="footer">
          <p>© 2026 Real Estate Platform. All rights reserved.</p>
          <p>Your trusted partner in finding the perfect home 🏠</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getBookingConfirmationTemplate = (userName, bookingDetails) => {
  const { propertyTitle, propertyAddress, checkInDate, checkOutDate, totalAmount, bookingId } = bookingDetails;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .success-icon { font-size: 60px; margin-bottom: 10px; }
        .content { padding: 40px 30px; }
        .booking-card { background: #f8f9fa; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .booking-detail { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        .booking-detail:last-child { border-bottom: none; }
        .label { color: #666; font-weight: 500; }
        .value { color: #333; font-weight: bold; }
        .total-amount { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; font-size: 24px; font-weight: bold; }
        .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { background: #333; color: white; text-align: center; padding: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✅</div>
          <h1>Booking Confirmed!</h1>
        </div>
        <div class="content">
          <p style="font-size: 18px; color: #333;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #555;">Great news! Your property booking has been confirmed successfully. 🎉</p>
          
          <div class="booking-card">
            <h3 style="color: #10b981; margin-top: 0;">📋 Booking Details</h3>
            <div class="booking-detail">
              <span class="label">Booking ID:</span>
              <span class="value">#${bookingId}</span>
            </div>
            <div class="booking-detail">
              <span class="label">Property:</span>
              <span class="value">${propertyTitle}</span>
            </div>
            <div class="booking-detail">
              <span class="label">Location:</span>
              <span class="value">${propertyAddress}</span>
            </div>
            <div class="booking-detail">
              <span class="label">Check-in:</span>
              <span class="value">${new Date(checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div class="booking-detail">
              <span class="label">Check-out:</span>
              <span class="value">${new Date(checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <div class="total-amount">
            💰 Total Amount: ₹${totalAmount.toLocaleString('en-IN')}
          </div>

          <div class="info-box">
            <strong>📌 Important Information:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Please carry a valid ID proof during check-in</li>
              <li>Contact property owner 24 hours before check-in</li>
              <li>Review cancellation policy in your dashboard</li>
            </ul>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You can view and manage your booking anytime from your dashboard.
          </p>

          <center>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold;">View My Bookings</a>
          </center>
        </div>
        <div class="footer">
          <p>© 2026 Real Estate Platform. All rights reserved.</p>
          <p>Questions? Contact us at support@realestate.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const mailOptions = {
      from: `"Real Estate Platform" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🏡 Welcome to Real Estate Platform - Start Your Journey!',
      html: getWelcomeEmailTemplate(userName)
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', userEmail);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

const sendBookingConfirmationEmail = async (userEmail, userName, bookingDetails) => {
  try {
    const mailOptions = {
      from: `"Real Estate Platform" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `✅ Booking Confirmed - ${bookingDetails.propertyTitle}`,
      html: getBookingConfirmationTemplate(userName, bookingDetails)
    };

    await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent to:', userEmail);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (userEmail, userName, resetCode) => {
  try {
    const mailOptions = {
      from: `"Real Estate Platform" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🔐 Password Reset Code - Real Estate Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .lock-icon { font-size: 60px; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .code-box { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0; font-size: 48px; font-weight: bold; letter-spacing: 10px; }
            .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { background: #333; color: white; text-align: center; padding: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="lock-icon">🔐</div>
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p style="font-size: 18px; color: #333;">Hi <strong>${userName}</strong>,</p>
              <p style="font-size: 16px; color: #555;">We received a request to reset your password. Use the code below to reset your password:</p>
              
              <div class="code-box">
                ${resetCode}
              </div>

              <div class="warning-box">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This code is valid for 10 minutes only</li>
                  <li>Don't share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you didn't request a password reset, your account is still secure. You can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 Real Estate Platform. All rights reserved.</p>
              <p>Security is our priority 🔒</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', userEmail);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendPasswordResetEmail
};
