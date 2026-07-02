const nodemailer = require('nodemailer');
const db = require('../config/database');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Handle sending notifications to users via SES SMTP
 */
async function handleNotification(data) {
  const { userId, type, bookingId, channels } = data;

  logger.info('Sending notification', { userId, type, bookingId });

  // Get user info
  const user = await db.query(
    'SELECT email, phone, full_name FROM users WHERE id = $1',
    [userId]
  );
  if (!user.rows[0]) {
    throw new Error(`User not found: ${userId}`);
  }

  const { email, phone, full_name } = user.rows[0];

  // Use full_name if available, otherwise extract name from email
  const displayName = full_name || email.split('@')[0];

  // Get booking details
  const booking = await db.query(
    `SELECT b.*, m.team_a, m.team_b, m.match_date, m.venue
     FROM bookings b
     JOIN matches m ON b.match_id = m.id
     WHERE b.id = $1`,
    [bookingId]
  );

  const bookingData = booking.rows[0];

  // Build notification message
  const message = buildNotificationMessage(type, {
    userName: displayName,
    userEmail: email,
    ...bookingData,
  });

  // Send to the ACTUAL user's email, not a hardcoded one
  const recipientEmail = email;
  const senderEmail = process.env.MAIL_FROM || 'phuonglinhit2k3@gmail.com';
  const senderName = process.env.MAIL_FROM_NAME || 'Ticket-Booking';

  // Send via Nodemailer (SMTP)
  if (channels.includes('email')) {
    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      logger.info('Notification sent via SES SMTP', { userId, type, bookingId, to: recipientEmail });
    } catch (err) {
      logger.error('Failed to send email via SMTP', { error: err.message });
      throw err;
    }
  }
}

// ============================================
// SHARED STYLES
// ============================================
const BRAND = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  success: '#10B981',
  successDark: '#059669',
  danger: '#EF4444',
  dangerDark: '#DC2626',
  warning: '#F59E0B',
  warningDark: '#D97706',
  info: '#3B82F6',
  textDark: '#1F2937',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  bg: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
};

function emailWrapper(content, accentColor = BRAND.primary) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg, ${accentColor}, ${accentColor}dd);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">🎟️ Ticket Booking</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">World Cup Qualifiers</div>
        </td></tr>
        
        <!-- Body -->
        <tr><td style="background:${BRAND.cardBg};padding:40px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
          ${content}
        </td></tr>
        
        <!-- Footer -->
        <tr><td style="background:${BRAND.cardBg};padding:24px 40px 32px;border-radius:0 0 16px 16px;border:1px solid ${BRAND.border};border-top:none;text-align:center;">
          <div style="border-top:1px solid ${BRAND.border};padding-top:24px;">
            <p style="margin:0;font-size:12px;color:${BRAND.textLight};">© ${new Date().getFullYear()} Ticket Booking System. All rights reserved.</p>
            <p style="margin:6px 0 0;font-size:11px;color:${BRAND.textLight};">Email này được gửi tự động. Vui lòng không trả lời email này.</p>
          </div>
        </td></tr>
        
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoRow(label, value, isHighlight = false) {
  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.textMuted};font-weight:500;width:140px;">${label}</td>
      <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${isHighlight ? BRAND.primary : BRAND.textDark};font-weight:${isHighlight ? '700' : '600'};">${value}</td>
    </tr>`;
}

function formatAmount(amount) {
  return parseFloat(amount).toLocaleString('vi-VN') + ' VNĐ';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function statusBadge(text, bgColor, textColor) {
  return `<span style="display:inline-block;background:${bgColor};color:${textColor};padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:0.5px;">${text}</span>`;
}

// ============================================
// TEMPLATES
// ============================================

function buildNotificationMessage(type, data) {
  const matchTitle = `${data.team_a} vs ${data.team_b}`;
  const shortId = data.id ? data.id.split('-')[0].toUpperCase() : 'N/A';
  const greeting = `Xin chào <strong>${data.userName}</strong>,`;

  const templates = {
    // ──────────────────────────────────────────
    // BOOKING CONFIRMED (Payment Success)
    // ──────────────────────────────────────────
    BOOKING_CONFIRMED: {
      subject: `✅ Xác nhận đặt vé thành công - ${matchTitle}`,
      text: `Xin chào ${data.userName},\n\nĐặt vé thành công!\nTrận đấu: ${matchTitle}\nThời gian: ${data.match_date}\nĐịa điểm: ${data.venue}\nMã đặt vé: ${shortId}\nTổng tiền: ${formatAmount(data.total_amount)}\n\nCảm ơn bạn!`,
      html: emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:72px;height:72px;background:${BRAND.success}15;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:36px;">✅</span>
          </div>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:${BRAND.textDark};">Đặt vé thành công!</h1>
          <p style="margin:8px 0 0;font-size:14px;color:${BRAND.textMuted};">Thanh toán đã được xác nhận</p>
        </div>

        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">${greeting}</p>
        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">
          Cảm ơn bạn đã đặt vé. Giao dịch của bạn đã hoàn tất. Dưới đây là thông tin chi tiết:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong>${matchTitle}</strong>`)}
          ${infoRow('Thời gian', formatDate(data.match_date))}
          ${infoRow('Địa điểm', data.venue)}
          ${infoRow('Mã đơn hàng', `#${shortId}`, true)}
          ${infoRow('Tổng tiền', `<span style="color:${BRAND.success};font-size:18px;font-weight:800;">${formatAmount(data.total_amount)}</span>`)}
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:${BRAND.textMuted};font-weight:500;">Trạng thái</td>
            <td style="padding:12px 16px;">${statusBadge('ĐÃ THANH TOÁN', `${BRAND.success}15`, BRAND.success)}</td>
          </tr>
        </table>

        <div style="background:${BRAND.success}08;border:1px solid ${BRAND.success}30;border-radius:12px;padding:16px 20px;margin-bottom:8px;">
          <p style="margin:0;font-size:13px;color:${BRAND.successDark};line-height:1.5;">
            💡 <strong>Lưu ý:</strong> Vui lòng lưu lại mã đơn hàng <strong>#${shortId}</strong> để xuất trình khi vào sân.
          </p>
        </div>
      `, BRAND.success),
    },

    // ──────────────────────────────────────────
    // PAYMENT FAILED
    // ──────────────────────────────────────────
    PAYMENT_FAILED: {
      subject: `❌ Thanh toán thất bại - Đơn hàng #${shortId}`,
      text: `Xin chào ${data.userName},\n\nThanh toán cho đơn hàng #${shortId} đã thất bại.\nVé đã được hoàn lại vào hệ thống. Bạn có thể đặt vé mới trên website.`,
      html: emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:72px;height:72px;background:${BRAND.danger}15;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:36px;">❌</span>
          </div>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:${BRAND.textDark};">Thanh toán không thành công</h1>
          <p style="margin:8px 0 0;font-size:14px;color:${BRAND.textMuted};">Giao dịch đã bị từ chối hoặc hết hạn</p>
        </div>

        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">${greeting}</p>
        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">
          Rất tiếc, giao dịch thanh toán cho đơn hàng <strong>#${shortId}</strong> đã không thành công.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong>${matchTitle}</strong>`)}
          ${infoRow('Mã đơn hàng', `#${shortId}`, true)}
          ${infoRow('Tổng tiền', formatAmount(data.total_amount))}
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:${BRAND.textMuted};font-weight:500;">Trạng thái</td>
            <td style="padding:12px 16px;">${statusBadge('THẤT BẠI', `${BRAND.danger}15`, BRAND.danger)}</td>
          </tr>
        </table>

        <div style="background:${BRAND.danger}08;border:1px solid ${BRAND.danger}30;border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.dangerDark};line-height:1.5;">
            Vé của bạn đã được hoàn lại vào hệ thống. Bạn có thể truy cập website để đặt vé mới.
          </p>
        </div>
      `, BRAND.danger),
    },

    // ──────────────────────────────────────────
    // BOOKING CREATED (Reservation / Pending Payment)
    // ──────────────────────────────────────────
    BOOKING_CREATED: {
      subject: `⏳ Đặt giữ chỗ thành công - ${matchTitle}`,
      text: `Xin chào ${data.userName},\n\nBạn đã đặt giữ chỗ thành công cho đơn hàng #${shortId}.\nVui lòng hoàn tất thanh toán trong vòng 10 phút.`,
      html: emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:72px;height:72px;background:${BRAND.warning}15;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:36px;">⏳</span>
          </div>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:${BRAND.textDark};">Đặt giữ chỗ thành công</h1>
          <p style="margin:8px 0 0;font-size:14px;color:${BRAND.textMuted};">Vui lòng hoàn tất thanh toán</p>
        </div>

        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">${greeting}</p>
        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">
          Bạn đã đặt giữ chỗ thành công. Vui lòng hoàn tất thanh toán để xác nhận vé.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong>${matchTitle}</strong>`)}
          ${infoRow('Thời gian', formatDate(data.match_date))}
          ${infoRow('Địa điểm', data.venue)}
          ${infoRow('Mã đơn hàng', `#${shortId}`, true)}
          ${infoRow('Tổng tiền', `<span style="font-size:18px;font-weight:800;">${formatAmount(data.total_amount)}</span>`)}
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:${BRAND.textMuted};font-weight:500;">Trạng thái</td>
            <td style="padding:12px 16px;">${statusBadge('CHỜ THANH TOÁN', `${BRAND.warning}15`, BRAND.warningDark)}</td>
          </tr>
        </table>

        <div style="background:${BRAND.warning}08;border:1px solid ${BRAND.warning}40;border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.warningDark};line-height:1.5;">
            ⚠️ <strong>Quan trọng:</strong> Vé sẽ bị hủy tự động nếu không thanh toán trong vòng <strong>10 phút</strong>.
          </p>
        </div>
      `, BRAND.warning),
    },

    // ──────────────────────────────────────────
    // BOOKING CANCELLED
    // ──────────────────────────────────────────
    BOOKING_CANCELLED: {
      subject: `🚫 Đã hủy đặt chỗ - Đơn hàng #${shortId}`,
      text: `Xin chào ${data.userName},\n\nĐơn hàng #${shortId} đã bị hủy do quá hạn thanh toán hoặc bạn tự hủy.\nVé đã được hoàn lại vào hệ thống.`,
      html: emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:72px;height:72px;background:${BRAND.danger}15;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:36px;">🚫</span>
          </div>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:${BRAND.textDark};">Đơn hàng đã bị hủy</h1>
          <p style="margin:8px 0 0;font-size:14px;color:${BRAND.textMuted};">Quá hạn thanh toán hoặc hủy bởi người dùng</p>
        </div>

        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">${greeting}</p>
        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">
          Đơn hàng <strong>#${shortId}</strong> đã bị hủy. Chỗ ngồi đã được hoàn lại vào hệ thống bán vé.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong>${matchTitle}</strong>`)}
          ${infoRow('Mã đơn hàng', `#${shortId}`, true)}
          ${infoRow('Tổng tiền', formatAmount(data.total_amount))}
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:${BRAND.textMuted};font-weight:500;">Trạng thái</td>
            <td style="padding:12px 16px;">${statusBadge('ĐÃ HỦY', `${BRAND.danger}15`, BRAND.danger)}</td>
          </tr>
        </table>

        <div style="background:${BRAND.info}08;border:1px solid ${BRAND.info}30;border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.info};line-height:1.5;">
            💡 Bạn có thể đặt vé mới bất cứ lúc nào trên website của chúng tôi.
          </p>
        </div>
      `, BRAND.danger),
    },

    // ──────────────────────────────────────────
    // BOOKING REMINDER
    // ──────────────────────────────────────────
    BOOKING_REMINDER: {
      subject: `⏰ Nhắc nhở - Trận đấu ${matchTitle} sắp diễn ra`,
      text: `Xin chào ${data.userName},\n\nTrận đấu ${matchTitle} sẽ diễn ra vào ${data.match_date}.\nĐịa điểm: ${data.venue}\n\nHãy đến sớm!`,
      html: emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:72px;height:72px;background:${BRAND.info}15;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:36px;">⏰</span>
          </div>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:${BRAND.textDark};">Trận đấu sắp diễn ra!</h1>
          <p style="margin:8px 0 0;font-size:14px;color:${BRAND.textMuted};">Đừng quên chuẩn bị nhé</p>
        </div>

        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">${greeting}</p>
        <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;margin:0 0 24px;">
          Trận đấu bạn đã đặt vé sắp diễn ra! Hãy chuẩn bị để có trải nghiệm tuyệt vời nhất.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong>${matchTitle}</strong>`)}
          ${infoRow('Thời gian', `<strong style="color:${BRAND.danger};">${formatDate(data.match_date)}</strong>`)}
          ${infoRow('Địa điểm', data.venue)}
          ${infoRow('Mã vé', `#${shortId}`, true)}
        </table>

        <div style="background:${BRAND.info}08;border:1px solid ${BRAND.info}30;border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.info};line-height:1.5;">
            🏟️ Hãy đến sân sớm ít nhất <strong>30 phút</strong> trước giờ thi đấu để ổn định chỗ ngồi.
          </p>
        </div>
      `, BRAND.info),
    },
  };

  return templates[type] || {
    subject: 'Thông báo từ Ticket Booking',
    text: 'Bạn có thông báo mới từ hệ thống đặt vé.',
    html: emailWrapper(`
      <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;">${greeting}</p>
      <p style="font-size:15px;color:${BRAND.textDark};line-height:1.6;">Bạn có thông báo mới từ hệ thống đặt vé. Vui lòng kiểm tra tài khoản của bạn.</p>
    `),
  };
}

module.exports = { handleNotification };
