// ============================================
// IMAP Email Reader - imapflow wrapper
// ============================================
// Fetches unread replies from a user's inbox that match a subject prefix.
// Used by the email reply processing cron job.

import { ImapFlow } from 'imapflow';
import type { ImapSettings } from '@/types';

export type ReminderType = 'water' | 'breakfast' | 'lunch' | 'dinner' | 'workout' | 'weighIn' | 'sleep';

export interface EmailReply {
  uid: number;
  from: string;
  subject: string;
  inReplyTo: string | null;
  textBody: string;
  receivedAt: Date;
  reminderType: ReminderType;
}

/**
 * Detect which reminder type an email subject refers to.
 * Returns null if the subject doesn't match any known reminder.
 */
export function detectReminderType(subject: string): ReminderType | null {
  const s = subject.toLowerCase();
  if (s.includes('hydrat') || s.includes('water')) return 'water';
  if (s.includes('breakfast')) return 'breakfast';
  if (s.includes('lunch')) return 'lunch';
  if (s.includes('dinner')) return 'dinner';
  if (s.includes('workout') || s.includes('gym') || s.includes('exercise')) return 'workout';
  if (s.includes('weigh') || s.includes('weight')) return 'weighIn';
  if (s.includes('sleep') || s.includes('bedtime')) return 'sleep';
  return null;
}

/**
 * Fetch all unread email replies whose subject contains `subjectPrefix`.
 * Marks each matched message as seen after fetching.
 * Returns an array of EmailReply objects (only those with a detectable reminderType).
 */
export async function fetchUnreadReplies(
  imapConfig: ImapSettings,
  subjectPrefix: string
): Promise<EmailReply[]> {
  const client = new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.secure,
    auth: {
      user: imapConfig.user,
      pass: imapConfig.pass,
    },
    logger: false,
  });

  const replies: EmailReply[] = [];

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    // Search for unseen messages matching subject prefix - use UID mode so msg.uid is reliable
    const searchResult = await client.search({ seen: false, subject: subjectPrefix }, { uid: true });
    const uids = Array.isArray(searchResult) ? searchResult : [];

    if (uids.length === 0) return replies;

    for await (const msg of client.fetch(uids as number[], {
      uid: true,
      envelope: true,
      bodyStructure: true,
      source: true,
    }, { uid: true })) {
      const subject = msg.envelope?.subject ?? '';
      const reminderType = detectReminderType(subject);
      if (!reminderType) continue;

      const from = msg.envelope?.from?.[0]?.address ?? '';
      const inReplyTo = msg.envelope?.inReplyTo ?? null;

      // Extract plain text from source
      const source = msg.source?.toString('utf8') ?? '';
      const textBody = extractPlainText(source);

      if (!textBody.trim()) continue;

      replies.push({
        uid: msg.uid,
        from,
        subject,
        inReplyTo,
        textBody: textBody.trim(),
        receivedAt: msg.envelope?.date ?? new Date(),
        reminderType,
      });

    }
  } finally {
    await client.logout().catch(() => {});
  }

  return replies;
}

/**
 * Check whether INBOX has any message whose subject contains `subjectPrefix`.
 * Does not filter by seen/unseen and does not mutate seen flags.
 */
export async function hasReplyWithSubject(
  imapConfig: ImapSettings,
  subjectPrefix: string
): Promise<boolean> {
  const client = new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.secure,
    auth: {
      user: imapConfig.user,
      pass: imapConfig.pass,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');
    const searchResult = await client.search({ subject: subjectPrefix });
    const uids = Array.isArray(searchResult) ? searchResult : [];
    return uids.length > 0;
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function markMessageSeen(
  imapConfig: ImapSettings,
  uid: number
): Promise<void> {
  const client = new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.secure,
    auth: {
      user: imapConfig.user,
      pass: imapConfig.pass,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');
    await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
  } finally {
    await client.logout().catch(() => {});
  }
}

/**
 * Extract the first plain-text part from a raw email source.
 * Strips quoted reply text (lines starting with '>').
 */
function extractPlainText(source: string): string {
  // Split headers from body
  const bodyStart = source.indexOf('\r\n\r\n');
  const body = bodyStart !== -1 ? source.slice(bodyStart + 4) : source;

  // Remove quoted reply lines (lines starting with '>')
  const lines = body.split('\n');
  const freshLines = lines.filter(
    (line) => !line.trimStart().startsWith('>') && !line.trimStart().startsWith('On ')
  );

  // Strip HTML tags if the body looks like HTML
  let text = freshLines.join('\n');
  if (text.includes('<html') || text.includes('<body')) {
    text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  }

  // Collapse whitespace
  return text.replace(/\r/g, '').trim().slice(0, 1000); // cap at 1000 chars
}
