import { NextResponse, NextRequest } from 'next/server';
import { getPrisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { verifySession } from '../../../../lib/auth';

const prisma = getPrisma();

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: 'Forbidden: Only Admins can manage passwords.' }, { status: 403 });
    }

    const { targetRole, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
    }

    let targetUser;

    if (targetRole) {
      // Find the user by role (either ADMIN or MANAGER)
      targetUser = await prisma.user.findFirst({
        where: { role: targetRole }
      });
    } else {
      // Find own user
      targetUser = await prisma.user.findUnique({
        where: { id: session.id }
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { passwordHash }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

