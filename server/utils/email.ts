import { Resend } from "resend";

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
  const acceptUrl = `https://c8ec6828-11e1-4f13-bc1a-ad5dd97bb72c-00-1w16g0bsxslil.kirk.repl.co/invitations/${token}/accept`;

  try {
    console.log("Attempting to send invitation email to:", email);
    const result = await resend.emails.send({
      from: "SportsAssist.io <weston.rosenau@sportsassist.io>",
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
    console.log("Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw new Error(
      `Failed to send invitation email: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
