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
        <p>When accepting this invitation, you'll need to provide your first and last name to complete your profile.</p>
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

export async function sendCampMessageEmail({
  email,
  recipientName,
  subject,
  content,
  campName,
  senderName,
  organizationName,
  messageId,
  recipientId,
}: {
  email: string;
  recipientName: string;
  subject: string;
  content: string;
  campName: string;
  senderName: string;
  organizationName: string;
  messageId: number;
  recipientId: number;
}) {
  try {
    console.log("Attempting to send camp message email to:", email);
    
    // Create a tracking pixel URL for email open tracking
    const trackingPixel = `https://c8ec6828-11e1-4f13-bc1a-ad5dd97bb72c-00-1w16g0bsxslil.kirk.repl.co/api/camp-messages/${messageId}/track/${recipientId}`;
    
    const result = await resend.emails.send({
      from: "SportsAssist.io <weston.rosenau@sportsassist.io>",
      to: email,
      subject: `${subject} - ${campName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">${subject}</h2>
            <p style="color: #666; font-size: 14px;">From: ${senderName} at ${organizationName}</p>
            <p style="color: #666; font-size: 14px;">Camp: ${campName}</p>
          </div>
          
          <div style="padding: 20px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
            ${content}
          </div>
          
          <div style="padding-top: 20px; font-size: 12px; color: #999;">
            <p>This message was sent to you regarding your participation in ${campName}.</p>
            <p>Please do not reply to this email. If you need to respond, please contact the camp organizer directly.</p>
          </div>
        </div>
        <img src="${trackingPixel}" alt="" width="1" height="1" style="display:none;" />
      `,
    });
    
    console.log("Camp message email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to send camp message email:", error);
    throw new Error(
      `Failed to send camp message email: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function sendCampMessageReplyEmail({
  recipientEmail,
  recipientName,
  senderName,
  campName,
  originalSubject,
  replyContent,
  replyUrl,
}: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  campName: string;
  originalSubject: string;
  replyContent: string;
  replyUrl: string;
}) {
  try {
    console.log("Attempting to send message reply notification to:", recipientEmail);
    
    const result = await resend.emails.send({
      from: "SportsAssist.io <weston.rosenau@sportsassist.io>",
      to: recipientEmail,
      subject: `New Reply: ${originalSubject} - ${campName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">New Reply to: ${originalSubject}</h2>
            <p style="color: #666; font-size: 14px;">From: ${senderName}</p>
            <p style="color: #666; font-size: 14px;">Camp: ${campName}</p>
          </div>
          
          <div style="padding: 20px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
            <p style="margin-bottom: 15px;"><strong>Reply Content:</strong></p>
            ${replyContent}
          </div>
          
          <div style="padding: 20px 0;">
            <a href="${replyUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View in SportsAssist</a>
          </div>
          
          <div style="padding-top: 20px; font-size: 12px; color: #999;">
            <p>This is a notification about a reply to a message in ${campName}.</p>
            <p>Please do not reply to this email. Log in to SportsAssist to continue the conversation.</p>
          </div>
        </div>
      `,
    });
    
    console.log("Message reply email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to send message reply email:", error);
    throw new Error(
      `Failed to send message reply email: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
