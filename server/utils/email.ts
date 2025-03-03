import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail({
  email,
  role,
  organizationName,
  token,
}: {
  email: string;
  role: string;
  organizationName: string;
  token: string;
}) {
  const acceptUrl = `${process.env.VITE_APP_URL || 'http://localhost:5000'}/invitations/${token}/accept`;
  
  try {
    await resend.emails.send({
      from: 'Sports Camp <noreply@resend.dev>',
      to: email,
      subject: `You're invited to join ${organizationName} as ${role}`,
      html: `
        <h2>You've been invited!</h2>
        <p>You have been invited to join ${organizationName} as a ${role}.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${acceptUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
        <p>This invitation will expire in 7 days.</p>
        <p>If you did not expect this invitation, please ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
}
