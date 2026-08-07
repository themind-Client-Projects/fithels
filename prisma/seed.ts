import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data (order matters for FK constraints)
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()

  console.log('✅ Cleared existing data')

  // --- Categories ---
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        nameEn: 'Stiletto Heels',
        nameAr: 'كعب ستيليتو',
        slug: 'stiletto-heels',
        image: '/images/products/womens/women-19.jpg',
      },
    }),
    prisma.category.create({
      data: {
        nameEn: 'Platform Heels',
        nameAr: 'كعب بلاتفورم',
        slug: 'platform-heels',
        image: '/images/products/womens/women-1.jpg',
      },
    }),
    prisma.category.create({
      data: {
        nameEn: 'Pumps',
        nameAr: 'بامبس',
        slug: 'pumps',
        image: '/images/products/womens/women-176.jpg',
      },
    }),
    prisma.category.create({
      data: {
        nameEn: 'Sandals',
        nameAr: 'صنادل',
        slug: 'sandals',
        image: '/images/products/womens/women-29.jpg',
      },
    }),
    prisma.category.create({
      data: {
        nameEn: 'Evening Heels',
        nameAr: 'كعب سهرة',
        slug: 'evening-heels',
        image: '/images/products/womens/women-83.jpg',
      },
    }),
  ])

  console.log(`✅ Created ${categories.length} categories`)

  const [stiletto, platform, pumps, sandals, evening] = categories

  // --- Products ---
  const products = await Promise.all([
    // 1. Stiletto Heels
    prisma.product.create({
      data: {
        titleEn: 'Stiletto Heels',
        titleAr: 'كعب ستيليتو',
        slug: 'stiletto-heels',
        descEn: 'Elegant stiletto heels crafted with premium materials. Perfect for special occasions and evening events.',
        descAr: 'كعب ستيليتو أنيق مصنوع من مواد فاخرة. مثالي للمناسبات الخاصة والسهرات.',
        price: 59.99,
        salePrice: null,
        images: [
          '/images/products/womens/women-19.jpg',
          '/images/products/womens/women-20.jpg',
        ],
        categoryId: stiletto.id,
        sizes: ['36', '37', '38', '39', '40', '41'],
        colors: ['أسود', 'بيج', 'أحمر'],
        stock: 25,
        isActive: true,
      },
    }),

    // 2. Classic Pumps (on sale)
    prisma.product.create({
      data: {
        titleEn: 'Classic Pumps',
        titleAr: 'بامبس كلاسيك',
        slug: 'classic-pumps',
        descEn: 'Timeless classic pumps with a comfortable fit. Versatile enough for work and evening wear.',
        descAr: 'بامبس كلاسيكي بتصميم مريح وخالد. متعدد الاستخدامات للعمل والسهرات.',
        price: 79.99,
        salePrice: 59.99,
        images: [
          '/images/products/womens/women-176.jpg',
          '/images/products/womens/women-179.jpg',
          '/images/products/womens/women-177.jpg',
        ],
        categoryId: pumps.id,
        sizes: ['36', '37', '38', '39', '40'],
        colors: ['أزرق فاتح', 'أسود', 'وردي'],
        stock: 30,
        isActive: true,
      },
    }),

    // 3. Block Heel Sandals
    prisma.product.create({
      data: {
        titleEn: 'Block Heel Sandals',
        titleAr: 'صندل بكعب عريض',
        slug: 'block-heel-sandals',
        descEn: 'Comfortable block heel sandals with adjustable straps. Great for all-day wear.',
        descAr: 'صنادل بكعب عريض مريحة مع أشرطة قابلة للتعديل. مثالية للارتداء طوال اليوم.',
        price: 89.99,
        salePrice: null,
        images: [
          '/images/products/womens/women-29.jpg',
          '/images/products/womens/women-30.jpg',
          '/images/products/womens/women-33.jpg',
        ],
        categoryId: sandals.id,
        sizes: ['36', '37', '38', '39', '40', '41'],
        colors: ['برتقالي', 'رمادي', 'بيج'],
        stock: 20,
        isActive: true,
      },
    }),

    // 4. Red Platform Heels
    prisma.product.create({
      data: {
        titleEn: 'Red Platform Heels',
        titleAr: 'كعب بلاتفورم أحمر',
        slug: 'red-platform-heels',
        descEn: 'Bold red platform heels that make a statement. Designed for confidence and style.',
        descAr: 'كعب بلاتفورم أحمر جريء يلفت الأنظار. مصمم للثقة والأناقة.',
        price: 69.99,
        salePrice: null,
        images: [
          '/images/products/womens/women-1.jpg',
          '/images/products/womens/women-2.jpg',
          '/images/products/womens/women-3.jpg',
        ],
        categoryId: platform.id,
        sizes: ['36', '37', '38', '39', '40'],
        colors: ['أحمر', 'وردي', 'رمادي غامق'],
        stock: 15,
        isActive: true,
      },
    }),

    // 5. Pink Suede Stilettos
    prisma.product.create({
      data: {
        titleEn: 'Pink Suede Stilettos',
        titleAr: 'ستيليتو شامواه وردي',
        slug: 'pink-suede-stilettos',
        descEn: 'Soft suede stilettos in a beautiful pink hue. Adds a pop of color to any outfit.',
        descAr: 'ستيليتو ناعم من الشامواه بلون وردي جميل. يضيف لمسة من الألوان لأي ملابس.',
        price: 39.99,
        salePrice: null,
        images: [
          '/images/products/womens/women-8.jpg',
          '/images/products/womens/women-9.jpg',
        ],
        categoryId: stiletto.id,
        sizes: ['36', '37', '38', '39', '40'],
        colors: ['وردي', 'أحمر', 'أبيض'],
        stock: 15,
        isActive: true,
      },
    }),

    // 6. Elegant Black Pumps
    prisma.product.create({
      data: {
        titleEn: 'Elegant Black Pumps',
        titleAr: 'بامبس أسود أنيق',
        slug: 'elegant-black-pumps',
        descEn: 'The quintessential black pump every wardrobe needs. Features a comfortable mid-heel.',
        descAr: 'البامبس الأسود الأساسي الذي تحتاجه كل خزانة ملابس. يتميز بكعب متوسط مريح.',
        price: 79.99,
        salePrice: null,
        images: [
          '/images/products/womens/women-171.jpg',
          '/images/products/womens/women-172.jpg',
        ],
        categoryId: pumps.id,
        sizes: ['35', '36', '37', '38', '39', '40', '41'],
        colors: ['أسود', 'برتقالي', 'وردي داكن'],
        stock: 45,
        isActive: true,
      },
    }),

    // 7. Strappy Summer Heels (on sale)
    prisma.product.create({
      data: {
        titleEn: 'Strappy Summer Heels',
        titleAr: 'كعب صيفي بأشرطة',
        slug: 'strappy-summer-heels',
        descEn: 'Light and airy strappy heels perfect for summer nights and vacations.',
        descAr: 'كعب بأشرطة خفيف ومناسب ليالي الصيف والإجازات.',
        price: 129.99,
        salePrice: 98.00,
        images: [
          '/images/products/womens/women-83.jpg',
          '/images/products/womens/women-84.jpg',
          '/images/products/womens/women-94.jpg',
          '/images/products/womens/women-87.jpg',
        ],
        categoryId: evening.id,
        sizes: ['36', '37', '38', '39', '40'],
        colors: ['أخضر فاتح', 'رمادي', 'أبيض'],
        stock: 18,
        isActive: true,
      },
    }),

    // 8. Chic Platform Heels
    prisma.product.create({
      data: {
        titleEn: 'Chic Platform Heels',
        titleAr: 'كعب بلاتفورم شيك',
        slug: 'chic-platform-heels',
        descEn: 'Premium chic platform heels with exceptional craftsmanship. The ultimate luxury footwear.',
        descAr: 'كعب بلاتفورم شيك فاخر بحرفية استثنائية. الحذاء الفاخر المطلق.',
        price: 219.99,
        salePrice: null,
        images: [
          '/images/products/womens/women-102.jpg',
          '/images/products/womens/women-103.jpg',
          '/images/products/womens/women-111.jpg',
        ],
        categoryId: platform.id,
        sizes: ['36', '37', '38', '39', '40', '41'],
        colors: ['رمادي', 'برتقالي فاتح', 'أبيض'],
        stock: 10,
        isActive: true,
      },
    }),
  ])

  console.log(`✅ Created ${products.length} products`)

  // --- Admin User & Permissions ---
  const adminEmail = 'ahmed.mh.coding@gmail.com'
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } })
  
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Ahmed MH',
        role: 'ADMIN',
      }
    })
  } else {
    adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' }
    })
  }

  await prisma.permission.upsert({
    where: { userId: adminUser.id },
    update: {
      canViewProducts: true, canCreateProducts: true, canEditProducts: true, canDeleteProducts: true,
      canViewOrders: true, canEditOrders: true, canDeleteOrders: true,
      canViewCustomers: true,
      canViewCategories: true, canCreateCategories: true, canEditCategories: true, canDeleteCategories: true,
      canViewSettings: true, canEditSettings: true,
      canViewDashboard: true,
    },
    create: {
      userId: adminUser.id,
      canViewProducts: true, canCreateProducts: true, canEditProducts: true, canDeleteProducts: true,
      canViewOrders: true, canEditOrders: true, canDeleteOrders: true,
      canViewCustomers: true,
      canViewCategories: true, canCreateCategories: true, canEditCategories: true, canDeleteCategories: true,
      canViewSettings: true, canEditSettings: true,
      canViewDashboard: true,
    }
  })

  console.log(`✅ Granted ADMIN role and full permissions to ${adminEmail}`)

  // --- Orders ---
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        userId: adminUser.id,
        total: products[0].price + products[1].price,
        status: 'DELIVERED',
        notes: 'Please leave at the front door.',
        phone: '+966501234567',
        location: 'الرياض، حي النخيل، شارع الأمير سلطان، مبنى رقم 12',
        estimatedDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        items: {
          create: [
            {
              productId: products[0].id,
              quantity: 1,
              price: products[0].price,
              size: '38',
              color: 'أسود',
            },
            {
              productId: products[1].id,
              quantity: 1,
              price: products[1].price,
              size: '39',
              color: 'أسود',
            }
          ]
        }
      }
    }),
    prisma.order.create({
      data: {
        userId: adminUser.id,
        total: products[2].price * 2,
        status: 'PROCESSING',
        phone: '+966507654321',
        location: 'جدة، حي الروضة، شارع التحلية، فيلا رقم 5',
        items: {
          create: [
            {
              productId: products[2].id,
              quantity: 2,
              price: products[2].price,
              size: '37',
              color: 'بيج',
            }
          ]
        }
      }
    }),
    prisma.order.create({
      data: {
        userId: adminUser.id,
        total: products[3].price,
        status: 'PENDING',
        notes: 'Urgent delivery if possible',
        phone: '+966509876543',
        location: 'الدمام، حي الشاطئ، طريق الملك فهد، عمارة 8، شقة 3',
        items: {
          create: [
            {
              productId: products[3].id,
              quantity: 1,
              price: products[3].price,
              size: '40',
              color: 'أحمر',
            }
          ]
        }
      }
    }),
  ])

  console.log(`✅ Created ${orders.length} mock orders for ${adminEmail}`)

  console.log('')
  console.log('🎉 Seed completed successfully!')
  console.log('')

  // Print summary
  for (const cat of categories) {
    const count = products.filter(p => p.categoryId === cat.id).length
    console.log(`  📁 ${cat.nameAr} (${cat.nameEn}) — ${count} products`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
