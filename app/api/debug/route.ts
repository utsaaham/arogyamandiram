import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  await connectDB();
  const user = await User.findOne({ email: 'kethankiran2003@gmail.com' })
    .select('+password')
    .lean();

  if (!user) return NextResponse.json({ error: 'no user' });

  const testPassword = '123456789';
  const hash = user.password as string;
  const match = await bcrypt.compare(testPassword, hash);

  // Also create a fresh hash and verify it works
  const freshHash = await bcrypt.hash(testPassword, 12);
  const freshMatch = await bcrypt.compare(testPassword, freshHash);

  return NextResponse.json({
    hashPrefix: hash.substring(0, 7),
    hashLength: hash.length,
    hashTail: hash.slice(-6),
    match,
    freshHash: freshHash.substring(0, 7),
    freshMatch,
    nodeVersion: process.version,
    bcryptjsVersion: require('bcryptjs/package.json').version,
  });
}
