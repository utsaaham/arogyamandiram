// ============================================
// /api/todos/groups - User-created checklist groups
// ============================================
// POST   { name } → create a group
// PUT    { id, name } → rename a group
// DELETE ?id= → delete a group (its items move to Daily)
//
// 'daily' is built in and cannot be renamed or deleted. The virtual 'care'
// group (derived from legacy care-category items) becomes a real stored
// group the first time it is renamed.

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { CARE_GROUP_ID, DAILY_GROUP_ID, type TodoGroup } from '@/lib/checklistGroups';
import { getAuthUserId, isUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().slice(0, 40);
  return name.length > 0 ? name : null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = (await req.json()) as { name?: string };
    const name = sanitizeName(body.name);
    if (!name) return errorResponse('name is required', 400);

    const group: TodoGroup = { id: crypto.randomUUID(), name };

    await connectDB();
    await User.findByIdAndUpdate(userId, {
      $push: { 'settings.todoGroups': group },
    });

    return maskedResponse({ group });
  } catch (err) {
    console.error('[Todo Groups POST Error]:', err);
    return errorResponse('Could not add that group. Try once more?', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = (await req.json()) as { id?: string; name?: string };
    const name = sanitizeName(body.name);
    if (!body.id || !name) return errorResponse('id and name are required', 400);
    if (body.id === DAILY_GROUP_ID) return errorResponse('The Daily group cannot be renamed', 400);

    await connectDB();

    const updated = await User.findOneAndUpdate(
      { _id: userId, 'settings.todoGroups.id': body.id },
      { $set: { 'settings.todoGroups.$.name': name } }
    );

    // Renaming the virtual Care group materializes it as a stored group.
    if (!updated && body.id === CARE_GROUP_ID) {
      await User.findByIdAndUpdate(userId, {
        $push: { 'settings.todoGroups': { id: CARE_GROUP_ID, name } },
      });
    }

    return maskedResponse({ ok: true });
  } catch (err) {
    console.error('[Todo Groups PUT Error]:', err);
    return errorResponse('That rename did not save. Try once more?', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('id is required', 400);
    if (id === DAILY_GROUP_ID) return errorResponse('The Daily group cannot be deleted', 400);

    await connectDB();

    // Members move to Daily rather than being deleted with the group. For the
    // care group, legacy items derive their group from category, so they need
    // an explicit group stamp too.
    const memberFilter = id === CARE_GROUP_ID
      ? { $or: [{ 't.group': id }, { 't.category': 'care', 't.group': { $exists: false } }] }
      : { 't.group': id };

    await User.findByIdAndUpdate(
      userId,
      {
        $pull: { 'settings.todoGroups': { id } },
        $set: { 'settings.todoTemplates.$[t].group': DAILY_GROUP_ID },
      },
      { arrayFilters: [memberFilter] }
    );

    return maskedResponse({ ok: true });
  } catch (err) {
    console.error('[Todo Groups DELETE Error]:', err);
    return errorResponse('Could not delete that group. Try once more?', 500);
  }
}
