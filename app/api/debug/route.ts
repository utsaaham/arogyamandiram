import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  await connectDB();

  if (action === 'reset') {
    const newHash = await bcrypt.hash('123456789', 12);
    await User.updateOne(
      { email: 'kethankiran2003@gmail.com' },
      { $set: { password: newHash } },
    );
    const verify = await User.findOne({ email: 'kethankiran2003@gmail.com' })
      .select('+password')
      .lean();
    const readBack = verify?.password as string;
    return NextResponse.json({
      action: 'reset',
      hashSet: newHash.slice(-6),
      hashReadBack: readBack?.slice(-6),
      match: await bcrypt.compare('123456789', readBack),
    });
  }

  const user = await User.findOne({ email: 'kethankiran2003@gmail.com' })
    .select('+password')
    .lean();
  if (!user) return NextResponse.json({ error: 'no user' });

  const hash = user.password as string;
  return NextResponse.json({
    hashTail: hash.slice(-6),
    match: await bcrypt.compare('123456789', hash),
    nodeVersion: process.version,
  });
}
