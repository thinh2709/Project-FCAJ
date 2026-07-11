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
// SHARED STYLES (MONOCHROME & LUXURY DARK THEME)
// ============================================
const BRAND = {
  primary: '#FFFFFF',       // Trắng
  primaryDark: '#E5E5E5',
  success: '#FFFFFF',       // Trắng cho hành động thành công
  successDark: '#A3A3A3',
  danger: '#EF4444',        // Đỏ tinh tế cho lỗi
  dangerDark: '#DC2626',
  warning: '#F59E0B',       // Cam tinh tế cho cảnh báo
  warningDark: '#D97706',
  info: '#A3A3A3',
  textDark: '#FFFFFF',      // Chữ trắng
  textMuted: '#A3A3A3',     // Chữ xám phụ
  textLight: '#6B6B6B',     // Chữ xám tối/muted
  bg: '#0A0A0A',            // Nền tối
  cardBg: '#151515',        // Nền card
  border: '#2A2A2A',        // Viền xám tối
};

function emailWrapper(content, accentColor = BRAND.primary) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Inter','Segoe UI',Arial,sans-serif;color:${BRAND.textDark};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${BRAND.cardBg};border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        
        <!-- Header -->
        <tr><td style="padding:40px 40px 30px;text-align:center;border-bottom:1px solid ${BRAND.border};">
          <div style="font-family:'Space Grotesk','Segoe UI',sans-serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">🎟️ TK-AWS</div>
          <div style="font-size:10px;color:${BRAND.textLight};margin-top:6px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">PREMIUM TICKETING</div>
        </td></tr>
        
        <!-- Body -->
        <tr><td style="padding:40px 40px 30px;">
          ${content}
        </td></tr>
        
        <!-- Footer -->
        <tr><td style="padding:30px 40px 40px;border-top:1px solid ${BRAND.border};text-align:center;">
          <p style="margin:0;font-size:11px;color:${BRAND.textLight};line-height:1.6;">© ${new Date().getFullYear()} TK-AWS. All rights reserved.</p>
          <p style="margin:6px 0 0;font-size:11px;color:${BRAND.textLight};line-height:1.6;">Email này được gửi tự động từ hệ thống. Vui lòng không trả lời email này.</p>
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
      <td style="padding:16px 20px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.textMuted};font-weight:500;width:140px;">${label}</td>
      <td style="padding:16px 20px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${isHighlight ? '#FFFFFF' : BRAND.textMuted};font-weight:${isHighlight ? '700' : '500'};">${value}</td>
    </tr>`;
}

function formatAmount(amount) {
  return parseFloat(amount).toLocaleString('vi-VN') + ' VND';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function statusBadge(text, bgColor, textColor) {
  return `<span style="display:inline-block;background:${bgColor};color:${textColor};padding:6px 16px;border-radius:30px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${text}</span>`;
}

// ============================================
// TEMPLATES
// ============================================

function buildNotificationMessage(type, data) {
  const matchTitle = `${data.team_a} vs ${data.team_b}`;
  const shortId = data.id ? data.id.split('-')[0].toUpperCase() : 'N/A';
  const greeting = `Xin chào <strong style="color: #FFFFFF;">${data.userName}</strong>,`;

  const templates = {
    // ──────────────────────────────────────────
    // BOOKING CONFIRMED (Payment Success)
    // ──────────────────────────────────────────
    BOOKING_CONFIRMED: {
      subject: `✅ Xác nhận đặt vé thành công - ${matchTitle}`,
      text: `Xin chào ${data.userName},\n\nĐặt vé thành công!\nTrận đấu: ${matchTitle}\nThời gian: ${data.match_date}\nĐịa điểm: ${data.venue}\nMã đặt vé: ${shortId}\nTổng tiền: ${formatAmount(data.total_amount)}\n\nCảm ơn bạn!`,
      html: emailWrapper(`
        <div style="text-align:center;margin-bottom:32px;">
          <div style="width:64px;height:64px;line-height:64px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:50%;display:inline-block;margin-bottom:16px;font-size:28px;">
            ✓
          </div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;font-family:'Space Grotesk',sans-serif;">Đặt vé thành công!</h1>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};">Thanh toán đã được xác nhận</p>
        </div>

        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 20px;">${greeting}</p>
        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 24px;">
          Cảm ơn bạn đã đặt vé tại TK-AWS. Giao dịch của bạn đã hoàn tất thành công. Dưới đây là thông tin chi tiết:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong style="color:#FFFFFF;">${matchTitle}</strong>`)}
          ${infoRow('Thời gian', formatDate(data.match_date))}
          ${infoRow('Địa điểm', data.venue)}
          ${infoRow('Mã đơn hàng', `#${shortId}`, true)}
          ${infoRow('Tổng tiền', `<span style="color:#FFFFFF;font-size:16px;font-weight:700;">${formatAmount(data.total_amount)}</span>`)}
          <tr>
            <td style="padding:16px 20px;font-size:13px;color:${BRAND.textMuted};font-weight:500;">Trạng thái</td>
            <td style="padding:16px 20px;">${statusBadge('ĐÃ THANH TOÁN', 'rgba(255,255,255,0.08)', '#FFFFFF')}</td>
          </tr>
        </table>

        <div style="background:rgba(255,255,255,0.03);border:1px solid ${BRAND.border};border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.5;">
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
        <div style="text-align:center;margin-bottom:32px;">
          <div style="width:64px;height:64px;line-height:64px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:50%;display:inline-block;margin-bottom:16px;font-size:28px;color:${BRAND.danger};">
            ✕
          </div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;font-family:'Space Grotesk',sans-serif;">Thanh toán thất bại</h1>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};">Giao dịch đã bị từ chối hoặc hết hạn</p>
        </div>

        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 20px;">${greeting}</p>
        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 24px;">
          Rất tiếc, giao dịch thanh toán cho đơn đặt chỗ <strong>#${shortId}</strong> đã không thành công.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong style="color:#FFFFFF;">${matchTitle}</strong>`)}
          ${infoRow('Mã đơn hàng', `#${shortId}`, true)}
          ${infoRow('Tổng tiền', formatAmount(data.total_amount))}
          <tr>
            <td style="padding:16px 20px;font-size:13px;color:${BRAND.textMuted};font-weight:500;">Trạng thái</td>
            <td style="padding:16px 20px;">${statusBadge('THẤT BẠI', 'rgba(239,68,68,0.1)', BRAND.danger)}</td>
          </tr>
        </table>

        <div style="background:rgba(239,68,68,0.03);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.5;">
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
        <div style="text-align:center;margin-bottom:32px;">
          <div style="width:64px;height:64px;line-height:64px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:50%;display:inline-block;margin-bottom:16px;font-size:28px;color:${BRAND.warning};">
            ⏳
          </div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;font-family:'Space Grotesk',sans-serif;">Đặt giữ chỗ thành công</h1>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};">Đang chờ hoàn tất thanh toán</p>
        </div>

        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 20px;">${greeting}</p>
        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 24px;">
          Yêu cầu đặt chỗ của bạn đã được ghi nhận. Vui lòng thanh toán trong thời gian quy định để sở hữu vé chính thức.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong style="color:#FFFFFF;">${matchTitle}</strong>`)}
          ${infoRow('Thời gian', formatDate(data.match_date))}
          ${infoRow('Địa điểm', data.venue)}
          ${infoRow('Mã đơn hàng', `#${shortId}`, true)}
          ${infoRow('Tổng tiền', `<span style="color:#FFFFFF;font-size:16px;font-weight:700;">${formatAmount(data.total_amount)}</span>`)}
          <tr>
            <td style="padding:16px 20px;font-size:13px;color:${BRAND.textMuted};font-weight:500;">Trạng thái</td>
            <td style="padding:16px 20px;">${statusBadge('CHỜ THANH TOÁN', 'rgba(245,158,11,0.1)', BRAND.warning)}</td>
          </tr>
        </table>

        <div style="background:rgba(245,158,11,0.03);border:1px solid rgba(245,158,11,0.15);border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.5;">
            ⚠️ <strong>Quan trọng:</strong> Vé giữ chỗ sẽ tự động bị hủy nếu giao dịch thanh toán không được hoàn tất trong vòng <strong>10 phút</strong>.
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
        <div style="text-align:center;margin-bottom:32px;">
          <div style="width:64px;height:64px;line-height:64px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:50%;display:inline-block;margin-bottom:16px;font-size:28px;color:${BRAND.danger};">
            ✕
          </div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;font-family:'Space Grotesk',sans-serif;">Đặt chỗ đã bị hủy</h1>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};">Hết hạn giữ chỗ hoặc chủ động hủy</p>
        </div>

        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 20px;">${greeting}</p>
        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 24px;">
          Đơn đặt chỗ <strong>#${shortId}</strong> của bạn đã bị hủy và ghế ngồi đã được chuyển về kho vé chung.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong style="color:#FFFFFF;">${matchTitle}</strong>`)}
          ${infoRow('Mã đơn hàng', `#${shortId}`, true)}
          ${infoRow('Tổng tiền', formatAmount(data.total_amount))}
          <tr>
            <td style="padding:16px 20px;font-size:13px;color:${BRAND.textMuted};font-weight:500;">Trạng thái</td>
            <td style="padding:16px 20px;">${statusBadge('ĐÃ HỦY', 'rgba(239,68,68,0.1)', BRAND.danger)}</td>
          </tr>
        </table>

        <div style="background:rgba(255,255,255,0.03);border:1px solid ${BRAND.border};border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.5;">
            💡 Bạn có thể truy cập website để đặt vé mới vào thời điểm khác.
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
        <div style="text-align:center;margin-bottom:32px;">
          <div style="width:64px;height:64px;line-height:64px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:50%;display:inline-block;margin-bottom:16px;font-size:28px;">
            ⏰
          </div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;font-family:'Space Grotesk',sans-serif;">Trận đấu sắp diễn ra!</h1>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};">Chuẩn bị sẵn sàng tham dự</p>
        </div>

        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 20px;">${greeting}</p>
        <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;margin:0 0 24px;">
          Sự kiện bạn đặt vé đang đến gần. Vui lòng sắp xếp thời gian để tham gia đúng giờ.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin-bottom:24px;">
          ${infoRow('Trận đấu', `<strong style="color:#FFFFFF;">${matchTitle}</strong>`)}
          ${infoRow('Thời gian', formatDate(data.match_date))}
          ${infoRow('Địa điểm', data.venue)}
          ${infoRow('Mã vé', `#${shortId}`, true)}
        </table>

        <div style="background:rgba(255,255,255,0.03);border:1px solid ${BRAND.border};border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.5;">
            🏟️ <strong>Lưu ý:</strong> Vui lòng có mặt tại sân vận động trước <strong>30-45 phút</strong> để thực hiện check-in và ổn định chỗ ngồi thuận lợi.
          </p>
        </div>
      `, BRAND.primary),
    },
  };

  return templates[type] || {
    subject: 'Thông báo từ TK-AWS',
    text: 'Bạn có thông báo mới từ hệ thống đặt vé.',
    html: emailWrapper(`
      <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">${greeting}</p>
      <p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Bạn có thông báo mới từ hệ thống đặt vé. Vui lòng truy cập tài khoản để kiểm tra chi tiết.</p>
    `),
  };
}

module.exports = { handleNotification };
