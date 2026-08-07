import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/make-admin
 * 
 * Temporary route to make the current signed-in user an ADMIN.
 * First syncs the user to DB, then upgrades their role.
 * 
 * Visit this URL while signed in: http://localhost:3000/api/make-admin
 */
export async function GET() {
  try {
    // First, sync the current Clerk user to our DB
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not signed in. Please sign in first, then visit this URL.' 
      }, { status: 401 });
    }

    // Now update their role to ADMIN
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    });

    return NextResponse.json({ 
      message: `Success! ${updated.email} is now ADMIN.`,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
