import nodemailer from "nodemailer";

let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  transporter =
    SMTP_HOST && SMTP_USER && SMTP_PASS
      ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: Number(SMTP_PORT) || 465,
          secure: (Number(SMTP_PORT) || 465) === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        })
      : null;
  return transporter;
}

export async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail] SMTP not configured, skipped email to ${to}: ${subject}`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html });
    return true;
  } catch (err) {
    console.error("[mail] failed:", err.message);
    return false;
  }
}

const wrapHtml = (title, body) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:#0f766e;color:#fff;padding:18px 24px;font-size:20px;font-weight:700">GearLoop</div>
    <div style="padding:24px;color:#111827"><h2 style="margin-top:0">${title}</h2>${body}</div>
  </div>`;

export function notifyBookingCompleted(booking) {
  const summary = `
    <p><b>Equipment:</b> ${booking.equipmentName}<br/>
    <b>Rental period:</b> ${booking.startDate} to ${booking.endDate}<br/>
    <b>Quantity:</b> ${booking.quantity}<br/>
    <b>Total:</b> $${booking.totalAmount}</p>`;
  return Promise.all([
    sendMail({
      to: booking.renterEmail,
      subject: `Rental completed: ${booking.equipmentName}`,
      html: wrapHtml("Your rental is complete", `<p>Hi ${booking.renterName}, thanks for renting with GearLoop.</p>${summary}`),
    }),
    sendMail({
      to: booking.ownerEmail,
      subject: `Rental completed: ${booking.equipmentName}`,
      html: wrapHtml("A rental has been completed", `<p>Hi ${booking.ownerName || "there"}, a booking for your equipment has finished.</p>${summary}`),
    }),
  ]);
}
