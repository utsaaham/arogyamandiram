// ============================================
// Email Templates — ArogyaMandiram Reminders
// ============================================
// Table-based, inline-styles only.
// Compatible with Gmail, Outlook, Apple Mail.

import type { ReminderType } from './imap';

interface TemplateContent {
  heading: string;
  body: string;
  hint: string;
  emoji: string;
}

const CONTENT: Record<ReminderType, TemplateContent> = {
  water: {
    emoji: '💧',
    heading: 'Did you drink enough water today?',
    body: 'Staying hydrated is one of the easiest wins for your health. Even a glass every hour adds up!',
    hint: 'e.g. &ldquo;750ml&rdquo; or &ldquo;3 glasses&rdquo; or &ldquo;1 litre&rdquo;',
  },
  breakfast: {
    emoji: '🌅',
    heading: 'Did you have breakfast today?',
    body: 'A nutritious breakfast sets the tone for your whole day. Tell us what you had &mdash; or just type <em>skipped</em>.',
    hint: 'e.g. &ldquo;2 eggs and toast&rdquo; or &ldquo;oats with banana&rdquo;',
  },
  lunch: {
    emoji: '🍛',
    heading: 'What did you have for lunch?',
    body: 'Keeping your midday meal on track helps you stay energised through the afternoon.',
    hint: 'e.g. &ldquo;oatmeal with berries&rdquo; or &ldquo;chicken sandwich&rdquo;',
  },
  dinner: {
    emoji: '🌙',
    heading: 'What did you have for dinner?',
    body: 'Log your dinner to complete today&rsquo;s nutrition picture. Even a light meal counts!',
    hint: 'e.g. &ldquo;salmon with rice&rdquo; or &ldquo;veggie wrap with yogurt&rdquo;',
  },
  workout: {
    emoji: '💪',
    heading: 'Did you work out today?',
    body: 'Every bit of movement counts &mdash; a short walk, a gym session, yoga, anything. How did you move today?',
    hint: 'e.g. &ldquo;30 min run&rdquo; or &ldquo;45 min gym&rdquo; or &ldquo;20 min yoga&rdquo;',
  },
  weighIn: {
    emoji: '⚖️',
    heading: "Don't forget to log your weight today",
    body: 'Tracking your weight consistently helps you spot meaningful trends over time.',
    hint: 'e.g. &ldquo;72.5 kg&rdquo; or &ldquo;160 lbs&rdquo;',
  },
  sleep: {
    emoji: '😴',
    heading: 'How was your sleep today?',
    body: 'Sleep is your recovery superpower. Tell us your sleep duration and optional quality to keep your trend accurate.',
    hint: 'e.g. &ldquo;7.5 hours, quality 4&rdquo; or &ldquo;6h&rdquo;',
  },
};

const SUBJECTS: Record<ReminderType, string> = {
  water:    'ArogyaMandiram: Time to hydrate! 💧',
  breakfast:'ArogyaMandiram: Good morning! Time for breakfast 🌅',
  lunch:    'ArogyaMandiram: Lunchtime check-in 🍛',
  dinner:   'ArogyaMandiram: Dinner time 🌙',
  workout:  'ArogyaMandiram: Workout check-in 💪',
  weighIn:  'ArogyaMandiram: Daily weigh-in reminder ⚖️',
  sleep:    'ArogyaMandiram: Sleep check-in 😴',
};

// ─── Action-first openers ─────────────────────────────────────────────────────
// One per reminder type, same for everyone. Formula: what to do + why it
// matters, in at most two short sentences. Warm but plain — no pet names,
// no flirting, the action always comes first.

const ACTION_OPENERS: Record<ReminderType, string> = {
  water:    'Time for a glass of water. Small sips through the day add up faster than you think.',
  breakfast:'Have your breakfast, then log it here. A solid morning meal keeps your energy steady until lunch.',
  lunch:    'Lunchtime — eat, then log what you had. Logging the midday meal keeps your day’s numbers honest.',
  dinner:   'Time to log your dinner. It completes today’s nutrition picture, even if it was just something light.',
  workout:  'Get your movement in today, then log it. A short walk counts just as much as a gym session.',
  weighIn:  'Step on the scale and log your weight. Daily readings are what make your trend line trustworthy.',
  sleep:    'Log last night’s sleep. Duration and quality drive your recovery and readiness numbers.',
};

function baseLayout(firstName: string, contentHtml: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ArogyaMandiram</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5"
         style="background-color:#f5f5f5;min-width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Outer card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff"
               style="background-color:#ffffff;max-width:600px;width:100%;border-radius:12px;
                      overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td bgcolor="#065f46" style="background-color:#065f46;padding:28px 32px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;
                        font-weight:bold;color:#ffffff;letter-spacing:0.5px;">
                ArogyaMandiram
              </p>
              <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                        color:#a7f3d0;letter-spacing:0.3px;">
                Your Personal Health Companion
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;
                        color:#374151;line-height:1.5;">
                Hi ${firstName},
              </p>
            </td>
          </tr>

          <!-- Content -->
          ${contentHtml}

          <!-- Reply CTA -->
          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0fdf4"
                     style="background-color:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                              font-weight:bold;color:#065f46;line-height:1.5;">
                      📩 Just reply to this email with your update!
                    </p>
                    <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                              color:#15803d;line-height:1.5;">
                      Your reply will be automatically logged to your ArogyaMandiram daily record.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                        color:#9ca3af;line-height:1.6;">
                You received this reminder because you have notifications enabled in your
                ArogyaMandiram preferences. To stop receiving these emails, go to
                <strong>Preferences &rarr; Reminder Notifications</strong> and toggle off the
                relevant reminder.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Outer card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getReminderTemplate(
  type: ReminderType,
  userName: string,
  gender?: string
): { subject: string; html: string } {
  void gender; // kept in the signature for caller compatibility; openers are the same for everyone
  const firstName = userName?.split(' ')[0] || 'there';
  const c = CONTENT[type];
  const opener = ACTION_OPENERS[type];

  const contentHtml = `
    <!-- Action-first opener -->
    <tr>
      <td style="padding:20px 32px 0 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;
                  color:#059669;line-height:1.6;">
          ${opener}
        </p>
      </td>
    </tr>

    <!-- Main heading -->
    <tr>
      <td style="padding:20px 32px 8px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;
                  font-weight:bold;color:#111827;line-height:1.3;">
          ${c.emoji}&nbsp; ${c.heading}
        </p>
      </td>
    </tr>

    <!-- Body copy -->
    <tr>
      <td style="padding:12px 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                  color:#4b5563;line-height:1.7;">
          ${c.body}
        </p>
      </td>
    </tr>

    <!-- Reply hint -->
    <tr>
      <td style="padding:0 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                  color:#6b7280;line-height:1.5;font-style:italic;">
          ${c.hint}
        </p>
      </td>
    </tr>
  `;

  return {
    subject: SUBJECTS[type],
    html: baseLayout(firstName, contentHtml),
  };
}

export function getSmtpTestTemplate(userName: string): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';
  const contentHtml = `
    <tr>
      <td style="padding:20px 32px 8px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;
                  font-weight:bold;color:#111827;line-height:1.3;">
          ✅ SMTP test successful
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                  color:#4b5563;line-height:1.7;">
          Nice work, your SMTP setup is working and this email was sent from your latest configuration.
          You can now use reminders confidently.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                  color:#6b7280;line-height:1.5;font-style:italic;">
          Next step: save IMAP and reply to the IMAP test email to verify incoming processing.
        </p>
      </td>
    </tr>
  `;

  return {
    subject: 'ArogyaMandiram: SMTP test email ✅',
    html: baseLayout(firstName, contentHtml),
  };
}

export function getImapTestTemplate(userName: string): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';
  const contentHtml = `
    <tr>
      <td style="padding:20px 32px 8px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;
                  font-weight:bold;color:#111827;line-height:1.3;">
          📬 IMAP reply test
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                  color:#4b5563;line-height:1.7;">
          Your IMAP setup is saved. To confirm incoming parsing works, please reply to this email with:
          <strong>1000 ml water</strong>. We will process that reply and mark IMAP as verified.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 20px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                  color:#6b7280;line-height:1.5;font-style:italic;">
          You can also reply with entries like &ldquo;Had lunch at 1:30 pm: grilled chicken and rice&rdquo; once setup is complete.
        </p>
      </td>
    </tr>
  `;

  return {
    subject: 'ArogyaMandiram: IMAP test - reply with 1000 ml water 📬',
    html: baseLayout(firstName, contentHtml),
  };
}
