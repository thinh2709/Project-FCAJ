const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const PDFDocument = require('pdfkit');
const db = require('../config/database');
const logger = require('../utils/logger');

const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * Generate e-ticket PDF and upload to S3
 */
async function handleTicketGeneration(data) {
  const { bookingId } = data;

  logger.info('Generating e-ticket PDF', { bookingId });

  // Get booking with tickets
  const booking = await db.query(
    `SELECT b.*, m.team_a, m.team_b, m.match_date, m.venue,
            u.full_name, u.email,
            json_agg(json_build_object('zone', t.seat_zone, 'seat', t.seat_number)) as tickets
     FROM bookings b
     JOIN matches m ON b.match_id = m.id
     JOIN users u ON b.user_id = u.id
     JOIN booking_items bi ON b.id = bi.booking_id
     JOIN tickets t ON bi.ticket_id = t.id
     WHERE b.id = $1
     GROUP BY b.id, m.id, u.id`,
    [bookingId]
  );

  if (!booking.rows[0]) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  const bookingData = booking.rows[0];

  // Generate PDF
  const pdfBuffer = await generatePDF(bookingData);

  // Upload to S3
  const s3Key = `tickets/${bookingId}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        bookingId: bookingId,
        generatedAt: new Date().toISOString(),
      },
    })
  );

  // Update booking with ticket URL
  await db.query(
    'UPDATE bookings SET ticket_pdf_url = $1, updated_at = NOW() WHERE id = $2',
    [`s3://${process.env.S3_BUCKET_NAME}/${s3Key}`, bookingId]
  );

  logger.info('E-ticket generated and uploaded', { s3Key });
}

/**
 * Generate a PDF document for the booking
 */
function generatePDF(booking) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).text('E-TICKET', { align: 'center' });
    doc.moveDown();

    // Match info
    doc.fontSize(18).text(`${booking.team_a} vs ${booking.team_b}`, { align: 'center' });
    doc
      .fontSize(12)
      .text(`Ngày: ${new Date(booking.match_date).toLocaleString('vi-VN')}`, { align: 'center' });
    doc.text(`Địa điểm: ${booking.venue}`, { align: 'center' });
    doc.moveDown();

    // Booking info
    doc.fontSize(12).text(`Mã đặt vé: ${booking.id}`);
    doc.text(`Khách hàng: ${booking.full_name}`);
    doc.text(`Email: ${booking.email}`);
    doc.moveDown();

    // Tickets
    doc.fontSize(14).text('Vé:', { underline: true });
    for (const ticket of booking.tickets) {
      doc.fontSize(12).text(`  • Khu ${ticket.zone} - Ghế ${ticket.seat}`);
    }
    doc.moveDown();

    // Total
    doc
      .fontSize(14)
      .text(`Tổng tiền: ${parseFloat(booking.total_amount).toLocaleString('vi-VN')} VNĐ`);

    // QR Code placeholder
    doc.moveDown();
    doc.rect(200, doc.y, 100, 100).stroke();
    doc.fontSize(10).text('QR Code', 225, doc.y + 40);

    doc.end();
  });
}

module.exports = { handleTicketGeneration };
