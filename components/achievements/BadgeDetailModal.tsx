'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import type { UserBadge } from '@/types';

interface BadgeDetailModalProps {
  badge: UserBadge | null;
  onClose: () => void;
}

const SITE_URL = 'https://arogyamandiram.vercel.app';
const SHARE_URL = 'https://arogyamandiram.vercel.app/share';
const GITHUB_URL = 'https://github.com/utsaaham/arogyamandiram';

function buildShareText(badge: UserBadge): string {
  return [
    `🏅 Earned "${badge.name}" on Arogyamandiram: ${badge.description}`,
    '',
    'Arogyamandiram is an open-source health & wellness tracker (food, water, workouts, sleep, weight, smart insights). We welcome contributors. Come help build it with us!',
    '',
    `🌐 Try it: ${SITE_URL}`,
    `⭐ Contribute on GitHub: ${GITHUB_URL}`,
    '',
    '#opensource #health #wellness #nextjs',
  ].join('\n');
}

function shareToTwitter(badge: UserBadge) {
  const text =
    `🏅 Earned "${badge.name}" on Arogyamandiram, an open-source health & wellness tracker.\n\n` +
    `Try it or contribute (we welcome PRs!):\n${GITHUB_URL}`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function shareToLinkedIn() {
  // LinkedIn's share endpoint only accepts a URL; the user adds the caption.
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function loadBadgeImage(badgeId: string): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  const svgRes = await fetch(`/badges/${badgeId}.svg`);
  const svgText = await svgRes.text();
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load badge SVG'));
    img.src = svgUrl;
  });
  return { img, cleanup: () => URL.revokeObjectURL(svgUrl) };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))),
      'image/png',
    );
  });
}

/** Square 1080×1080 — for downloads, feed posts. */
async function renderBadgeSquarePng(badgeId: string): Promise<Blob> {
  const { img, cleanup } = await loadBadgeImage(badgeId);
  try {
    const size = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0, size, size);
    return await canvasToBlob(canvas);
  } finally {
    cleanup();
  }
}

/** Wrap text into lines that fit within maxWidth. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Generate a QR code as a loaded HTMLImageElement. */
async function loadQrImage(url: string, size: number): Promise<HTMLImageElement> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: '#20394A', light: '#F2E8D0' },
    errorCorrectionLevel: 'M',
  });
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load QR code'));
    img.src = dataUrl;
  });
  return img;
}

/** Instagram-Story 1080×1920 with badge + description + QR + open-source CTA baked in. */
async function renderBadgeStoryPng(badge: UserBadge): Promise<Blob> {
  const { img: badgeImg, cleanup } = await loadBadgeImage(badge.id);
  try {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Background: navy gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#152838');
    bg.addColorStop(1, '#20394A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // --- Top block (positioned so top/bottom margins are visually balanced) ---
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(242, 232, 208, 0.65)';
    ctx.font = '600 32px Georgia, "Times New Roman", serif';
    ctx.fillText('A C H I E V E M E N T   U N L O C K E D', W / 2, 290);

    const badgeSize = 720;
    const badgeX = (W - badgeSize) / 2;
    const badgeY = 350;
    ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);

    // Description, wrapped
    ctx.fillStyle = '#F2E8D0';
    ctx.font = '500 42px Georgia, "Times New Roman", serif';
    const descLines = wrapLines(ctx, badge.description, W - 200);
    let textY = badgeY + badgeSize + 80;
    for (const line of descLines) {
      ctx.fillText(line, W / 2, textY);
      textY += 56;
    }

    // --- Bottom block (no divider; tight gap from description to heading) ---
    const ctaTop = textY + 40;

    ctx.fillStyle = '#C9A227';
    ctx.font = '700 36px Georgia, "Times New Roman", serif';
    ctx.fillText('OPEN-SOURCE · JOIN US', W / 2, ctaTop);

    ctx.fillStyle = 'rgba(242, 232, 208, 0.85)';
    ctx.font = '400 32px Georgia, "Times New Roman", serif';
    ctx.fillText('Health & wellness tracker built by the community.', W / 2, ctaTop + 55);

    const qrSize = 260;
    const qrPadding = 24;
    const qrFrame = qrSize + qrPadding * 2;
    const qrFrameX = (W - qrFrame) / 2;
    const qrFrameY = ctaTop + 95;

    ctx.fillStyle = '#F2E8D0';
    roundRect(ctx, qrFrameX, qrFrameY, qrFrame, qrFrame, 16);
    ctx.fill();

    const qrImg = await loadQrImage(SHARE_URL, qrSize);
    ctx.drawImage(qrImg, qrFrameX + qrPadding, qrFrameY + qrPadding, qrSize, qrSize);

    ctx.fillStyle = 'rgba(242, 232, 208, 0.75)';
    ctx.font = '500 28px Georgia, "Times New Roman", serif';
    ctx.fillText('Scan to explore & contribute', W / 2, qrFrameY + qrFrame + 40);

    ctx.fillStyle = 'rgba(242, 232, 208, 0.4)';
    ctx.font = '400 24px Georgia, "Times New Roman", serif';
    ctx.fillText('Arogyamandiram', W / 2, qrFrameY + qrFrame + 85);

    return await canvasToBlob(canvas);
  } finally {
    cleanup();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a: HTMLAnchorElement = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  const [flipped, setFlipped] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (badge) {
      setFlipped(false);
      setShareStatus(null);
    }
  }, [badge?.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!badge) return null;

  const earnedDate = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  async function shareStoryImage(
    desktopFallback: (caption: string, pngBlob: Blob) => Promise<string>,
  ): Promise<void> {
    if (!badge) return;
    setBusy(true);
    setShareStatus(null);
    try {
      const pngBlob = await renderBadgeStoryPng(badge);
      const file = new File([pngBlob], `${badge.id}-story.png`, { type: 'image/png' });
      const caption = buildShareText(badge);

      const navAny = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
      };

      if (navAny.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: `${badge.name} · Arogyamandiram`,
            text: caption,
            files: [file],
          });
          setShareStatus('Shared!');
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            setShareStatus(null);
            return;
          }
        }
      }

      const status = await desktopFallback(caption, pngBlob);
      setShareStatus(status);
    } catch {
      setShareStatus('Could not prepare image. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function shareToInstagram() {
    return shareStoryImage(async (caption, pngBlob) => {
      if (!badge) return '';
      downloadBlob(pngBlob, `${badge.id}-story.png`);
      try {
        await navigator.clipboard.writeText(caption);
        return 'Badge downloaded · caption copied to clipboard';
      } catch {
        return 'Badge downloaded. Paste it to Instagram Stories from your phone.';
      }
    });
  }

  function shareToWhatsApp() {
    return shareStoryImage(async (caption, pngBlob) => {
      if (!badge) return '';
      downloadBlob(pngBlob, `${badge.id}-story.png`);
      window.open(
        `https://wa.me/?text=${encodeURIComponent(caption)}`,
        '_blank',
        'noopener,noreferrer',
      );
      return 'Badge downloaded and WhatsApp opened. Attach the image manually.';
    });
  }

  async function downloadOnly() {
    if (!badge) return;
    setBusy(true);
    setShareStatus(null);
    try {
      const pngBlob = await renderBadgeSquarePng(badge.id);
      downloadBlob(pngBlob, `${badge.id}.png`);
      setShareStatus('Downloaded');
    } catch {
      setShareStatus('Download failed');
    } finally {
      setBusy(false);
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[90] rounded-lg bg-black/60 p-1.5 text-text-muted shadow-md transition-colors hover:bg-black/80 hover:text-text-primary"
        aria-label="Close badge details"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative z-[80] flex flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="aspect-square w-[min(80vw,340px)] [perspective:1200px]"
        >
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? 'Show badge front' : 'Show badge details'}
            className="relative h-full w-full cursor-pointer rounded-full outline-none transition-transform duration-700 [transform-style:preserve-3d] focus-visible:ring-2 focus-visible:ring-amber-400/60"
            style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/badges/${badge.id}.svg`}
                alt={badge.name}
                className="h-full w-full select-none"
                draggable={false}
              />
            </div>
            <div
              className="absolute inset-0 [backface-visibility:hidden]"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <BadgeBack description={badge.description} earnedDate={earnedDate} />
            </div>
          </button>
        </div>

        {/* Share row */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <ShareButton
              label="Share on Twitter"
              onClick={() => shareToTwitter(badge)}
              disabled={busy}
            >
              <TwitterIcon className="h-5 w-5" />
            </ShareButton>
            <ShareButton
              label="Share on LinkedIn"
              onClick={shareToLinkedIn}
              disabled={busy}
            >
              <LinkedInIcon className="h-5 w-5" />
            </ShareButton>
            <ShareButton
              label="Share to Instagram"
              onClick={shareToInstagram}
              disabled={busy}
            >
              <InstagramIcon className="h-5 w-5" />
            </ShareButton>
            <ShareButton
              label="Share to WhatsApp"
              onClick={shareToWhatsApp}
              disabled={busy}
            >
              <WhatsAppIcon className="h-5 w-5" />
            </ShareButton>
            <ShareButton
              label="Download badge image"
              onClick={downloadOnly}
              disabled={busy}
            >
              <Download className="h-5 w-5" />
            </ShareButton>
          </div>
          {shareStatus && (
            <p className="text-[11px] text-text-muted">{shareStatus}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}

function ShareButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-text-primary transition-colors hover:bg-white/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function BadgeBack({
  description,
  earnedDate,
}: {
  description: string;
  earnedDate: string | null;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#F2E8D0]">
      <div className="flex flex-col items-center justify-center px-[14%] text-center">
        <p
          className="text-[#20394A]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1rem', lineHeight: 1.4 }}
        >
          {description}
        </p>
        {earnedDate && (
          <p
            className="mt-5 text-[#20394A]/60"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Earned {earnedDate}
          </p>
        )}
      </div>
    </div>
  );
}
