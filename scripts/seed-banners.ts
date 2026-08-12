import { prisma } from '@/lib/prisma'

/**
 * Three real hero slides. Images are files that exist in public/images/slider,
 * so the carousel renders on a fresh checkout without any upload step; an admin
 * replaces them from the dashboard (which now uploads to Supabase).
 */
const BANNERS = [
  {
    titleAr: 'أناقة تبدأ من خطوتك',
    titleEn: 'Elegance Starts With Your Step',
    btnTextAr: 'تسوقي الآن',
    btnTextEn: 'Shop Now',
    image: '/images/slider/slider-women1.jpg',
    link: '/shop-default-grid',
    order: 0,
  },
  {
    titleAr: 'تشكيلة الكعب الجديدة',
    titleEn: 'The New Heels Collection',
    btnTextAr: 'اكتشفي التشكيلة',
    btnTextEn: 'Discover The Collection',
    image: '/images/slider/slider-fashion-classyCove1.jpg',
    link: '/shop-default-grid',
    order: 1,
  },
  {
    titleAr: 'إطلالة المساء',
    titleEn: 'Evening Edit',
    btnTextAr: 'تسوقي الإطلالة',
    btnTextEn: 'Shop The Edit',
    image: '/images/slider/slider-fashion-eleganNest1.jpg',
    link: '/shop-default-grid',
    order: 2,
  },
]

async function main() {
  const existing = await prisma.banner.count()
  if (existing > 0) {
    console.log(`Banners already present (${existing}) — leaving them alone.`)
    return
  }
  for (const b of BANNERS) {
    const created = await prisma.banner.create({ data: { ...b, isActive: true } })
    console.log('created', created.order, created.titleAr)
  }
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
