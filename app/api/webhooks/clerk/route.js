import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET env variable');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  const eventType = evt.type;

  // Handle user.created and user.updated
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, phone_numbers, public_metadata } = evt.data;

    const primaryEmail = email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)?.email_address 
      || email_addresses?.[0]?.email_address;
    const fullName = [first_name, last_name].filter(Boolean).join(' ') || null;
    const phone = phone_numbers?.[0]?.phone_number || null;

    if (!primaryEmail) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    // Determine role from public_metadata (set via Clerk Dashboard)
    const role = public_metadata?.role || 'CUSTOMER';

    await prisma.user.upsert({
      where: { clerkId: id },
      update: {
        email: primaryEmail,
        name: fullName,
        phone: phone,
        role: role,
      },
      create: {
        clerkId: id,
        email: primaryEmail,
        name: fullName,
        phone: phone,
        role: role,
      },
    });

    console.log(`✓ User ${eventType}: ${primaryEmail} (${role})`);
  }

  // Handle user.deleted
  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      await prisma.user.delete({
        where: { clerkId: id },
      });
      console.log(`✓ User deleted: ${id}`);
    } catch (err) {
      // User might not exist in our DB — that's fine
      console.log(`User ${id} not found in DB, skipping delete`);
    }
  }

  return NextResponse.json({ received: true });
}
