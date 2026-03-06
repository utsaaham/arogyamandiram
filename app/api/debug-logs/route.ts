// ============================================
// /api/debug-logs — Persist & list debug logs by page/agent (DEBUG_MODE only)
// ============================================
// GET: ?page=&agent= → logs for that agent. No params → tree of pages/agents with counts.
// POST: body = { page, agent, log } → write to .debug-logs/{page}/{agent}/{id}.json

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getAuthUserId, isUserId } from '@/lib/session';
import { errorResponse } from '@/lib/apiMask';
import { promises as fs } from 'fs';
import path from 'path';
import { getPageLabel, getAgentLabel } from '@/lib/debugLogsConfig';

const DEBUG_LOGS_DIR = '.debug-logs';

function getDir(): string {
  return path.join(process.cwd(), DEBUG_LOGS_DIR);
}

/** Get user's log folder name: username if set, else userId (for users without username). */
async function getUserLogId(userId: string): Promise<string> {
  await connectDB();
  const user = await User.findById(userId).select('username').lean();
  const username = (user as { username?: string } | null)?.username;
  if (username && username.trim()) {
    return username.trim().toLowerCase();
  }
  return userId;
}

function getAgentDir(userLogId: string, page: string, agent: string): string {
  return path.join(getDir(), userLogId, page, agent);
}

/** Safe filename from timestamp + random suffix. */
function idFromLog(log: { userRequest?: { requestedAt?: string }; metadata?: { timestamp?: string } }): string {
  const iso = log.userRequest?.requestedAt ?? log.metadata?.timestamp ?? new Date().toISOString();
  const base = iso.replace(/[:.]/g, '-').slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

type TreePage = { page: string; pageLabel: string; agents: { agent: string; agentLabel: string; count: number; lastActive: string }[] };
type Tree = TreePage[];

export async function GET(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') {
    return errorResponse('Debug logs only available when NEXT_PUBLIC_DEBUG_MODE is true', 403);
  }
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page');
  const agent = searchParams.get('agent');

  try {
    const userLogId = await getUserLogId(userId);
    const root = getDir();
    const userRoot = path.join(root, userLogId);
    await fs.mkdir(userRoot, { recursive: true });

    if (page != null && page !== '' && agent != null && agent !== '') {
      const logs: unknown[] = [];
      const agentDir = getAgentDir(userLogId, page, agent);
      try {
        const names = await fs.readdir(agentDir);
        const jsonNames = names.filter((n) => n.endsWith('.json'));
        for (const name of jsonNames) {
          try {
            const raw = await fs.readFile(path.join(agentDir, name), 'utf-8');
            logs.push(JSON.parse(raw));
          } catch {
            // skip
          }
        }
      } catch {
        // Dir doesn't exist
      }
      // Legacy: flat .debug-logs/{userLogId}/*.json or old .debug-logs/*.json (no user prefix)
      if (page === 'food' && agent === 'meal-ideas') {
        const rootNames = await fs.readdir(userRoot).catch(() => []);
        for (const name of rootNames) {
          if (!name.endsWith('.json')) continue;
          const full = path.join(userRoot, name);
          const stat = await fs.stat(full).catch(() => null);
          if (!stat?.isFile()) continue;
          try {
            const raw = await fs.readFile(full, 'utf-8');
            logs.push(JSON.parse(raw));
          } catch {
            // skip
          }
        }
      }
      const ts = (l: unknown) =>
        (l as { metadata?: { timestamp?: string }; userRequest?: { requestedAt?: string } }).metadata?.timestamp
          ?? (l as { userRequest?: { requestedAt?: string } }).userRequest?.requestedAt ?? '';
      logs.sort((a, b) => ts(b).localeCompare(ts(a)));
      return Response.json({ logs });
    }

    // No page/agent → return tree (pages with agents, count, lastActive) — only for this user
    const tree: Tree = [];
    let pageDirs: string[] = [];
    try {
      pageDirs = await fs.readdir(userRoot);
    } catch {
      return Response.json({ tree: [] });
    }
    // Legacy: count flat .json files in user root as food/meal-ideas
    let legacyCount = 0;
    let legacyLastActive = '';
    for (const name of pageDirs) {
      if (!name.endsWith('.json')) continue;
      const full = path.join(userRoot, name);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat?.isFile()) continue;
      legacyCount++;
      try {
        const raw = await fs.readFile(full, 'utf-8');
        const log = JSON.parse(raw);
        const ts = log.metadata?.timestamp ?? log.userRequest?.requestedAt ?? '';
        if (ts > legacyLastActive) legacyLastActive = ts;
      } catch {
        // skip
      }
    }
    const seenPages = new Set<string>();
    if (legacyCount > 0) {
      tree.push({
        page: 'food',
        pageLabel: getPageLabel('food'),
        agents: [
          { agent: 'meal-ideas', agentLabel: getAgentLabel('meal-ideas'), count: legacyCount, lastActive: legacyLastActive },
        ],
      });
      seenPages.add('food');
    }
    for (const pageSlug of pageDirs) {
      const pagePath = path.join(userRoot, pageSlug);
      const stat = await fs.stat(pagePath).catch(() => null);
      if (!stat?.isDirectory() || pageSlug.startsWith('.')) continue;
      const agentDirs = await fs.readdir(pagePath).catch(() => []);
      const agents: TreePage['agents'] = [];
      for (const agentSlug of agentDirs) {
        const agentPath = path.join(pagePath, agentSlug);
        const agentStat = await fs.stat(agentPath).catch(() => null);
        if (!agentStat?.isDirectory()) continue;
        const files = await fs.readdir(agentPath).catch(() => []);
        const jsonFiles = files.filter((f) => f.endsWith('.json'));
        let lastActive = '';
        for (const f of jsonFiles) {
          try {
            const raw = await fs.readFile(path.join(agentPath, f), 'utf-8');
            const log = JSON.parse(raw);
            const ts = log.metadata?.timestamp ?? log.userRequest?.requestedAt ?? '';
            if (ts > lastActive) lastActive = ts;
          } catch {
            // skip
          }
        }
        agents.push({
          agent: agentSlug,
          agentLabel: getAgentLabel(agentSlug),
          count: jsonFiles.length,
          lastActive,
        });
      }
      if (agents.length > 0) {
        const existing = tree.find((t) => t.page === pageSlug);
        if (existing) {
          for (const ag of agents) {
            const ex = existing.agents.find((a) => a.agent === ag.agent);
            if (ex) {
              ex.count += ag.count;
              if (ag.lastActive > ex.lastActive) ex.lastActive = ag.lastActive;
            } else {
              existing.agents.push(ag);
            }
          }
          existing.agents.sort((a, b) => b.lastActive.localeCompare(a.lastActive));
        } else {
          tree.push({
            page: pageSlug,
            pageLabel: getPageLabel(pageSlug),
            agents: agents.sort((a, b) => b.lastActive.localeCompare(a.lastActive)),
          });
        }
      }
    }
    tree.sort((a, b) => a.pageLabel.localeCompare(b.pageLabel));
    return Response.json({ tree });
  } catch (err) {
    console.error('[Debug logs GET]:', err);
    return errorResponse('Failed to read debug logs', 500);
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') {
    return errorResponse('Debug logs only available when NEXT_PUBLIC_DEBUG_MODE is true', 403);
  }
  const userId = await getAuthUserId();
  if (!isUserId(userId)) return userId;

  try {
    const userLogId = await getUserLogId(userId);
    const body = await req.json();
    const page = typeof body.page === 'string' ? body.page : 'food';
    const agent = typeof body.agent === 'string' ? body.agent : 'meal-ideas';
    const log = body.log ?? body;
    const logWithUser = {
      ...(typeof log === 'object' && log !== null ? log : { log }),
      metadata: {
        ...(typeof (log as { metadata?: Record<string, unknown> })?.metadata === 'object'
          ? (log as { metadata: Record<string, unknown> }).metadata
          : {}),
        username: userLogId,
      },
    };
    const id = idFromLog(logWithUser);
    const agentDir = getAgentDir(userLogId, page, agent);
    await fs.mkdir(agentDir, { recursive: true });
    const filePath = path.join(agentDir, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(logWithUser, null, 2), 'utf-8');
    return Response.json({ ok: true, id });
  } catch (err) {
    console.error('[Debug logs POST]:', err);
    return errorResponse('Failed to save debug log', 500);
  }
}
