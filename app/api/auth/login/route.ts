import { NextResponse } from 'next/server';
import { getPrisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '../../../../lib/auth';

export async function POST(request: Request) {
  try {
    const { role, password } = await request.json();

    if (!role || !password) {
      return NextResponse.json(
        { error: 'Role and password are required' },
        { status: 400 }
      );
    }

    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    const user = await prisma.user.findFirst({
      where: { role },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Account not found.' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password.' },
        { status: 401 }
      );
    }

    const token = await createSession(user.id);

    const response = NextResponse.json({ success: true, role: user.role });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

