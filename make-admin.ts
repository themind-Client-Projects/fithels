import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = 'ahmed.mh.coding@gmail.com'
  
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.log(`User ${email} not found. Ensure you have logged in via Clerk to sync the user.`)
    process.exit(1)
  }

  user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
  })

  await prisma.permission.upsert({
    where: { userId: user.id },
    update: {
      canViewProducts: true, canCreateProducts: true, canEditProducts: true, canDeleteProducts: true,
      canViewOrders: true, canEditOrders: true, canDeleteOrders: true,
      canViewCustomers: true,
      canViewCategories: true, canCreateCategories: true, canEditCategories: true, canDeleteCategories: true,
      canViewSettings: true, canEditSettings: true,
      canViewDashboard: true,
    },
    create: {
      userId: user.id,
      canViewProducts: true, canCreateProducts: true, canEditProducts: true, canDeleteProducts: true,
      canViewOrders: true, canEditOrders: true, canDeleteOrders: true,
      canViewCustomers: true,
      canViewCategories: true, canCreateCategories: true, canEditCategories: true, canDeleteCategories: true,
      canViewSettings: true, canEditSettings: true,
      canViewDashboard: true,
    }
  })

  console.log(`User ${email} is now an ADMIN.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
