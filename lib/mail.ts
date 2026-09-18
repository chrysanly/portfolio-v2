import { Resend } from 'resend';
import type { ContactInput } from './schema';

/** The only vendor-aware file. Swapping providers touches nothing else. */
export async function sendContactMessage(input: ContactInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !to) {
    throw new Error('Mail is not configured: set RESEND_API_KEY and CONTACT_TO_EMAIL.');
  }

  const resend = new Resend(apiKey);

  const lines = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.company ? `Company: ${input.company}` : null,
    '',
    input.message,
  ].filter((line): line is string => line !== null);

  const { error } = await resend.emails.send({
    from: 'Portfolio <onboarding@resend.dev>',
    to: [to],
    replyTo: input.email,
    subject: `Enquiry from ${input.name}`,
    text: lines.join('\n'),
  });

  if (error) throw new Error(error.message);
}
