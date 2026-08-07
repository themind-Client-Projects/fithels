import { z } from 'zod'

export const productSchema = z.object({
  titleEn: z.string().min(1, 'English title required'),
  titleAr: z.string().min(1, 'Arabic title required'),
  descEn: z.string().optional(),
  descAr: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  salePrice: z.number().positive().optional(),
  images: z.array(z.string().url()).min(1, 'At least 1 image'),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  stock: z.number().int().min(0),
  isActive: z.boolean(),
  categoryId: z.string().min(1, 'Category required'),
})

export const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    size: z.string().optional(),
    color: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
})

export const categorySchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  slug: z.string().min(1),
  image: z.string().url().optional().nullable(),
})

export const orderStatusSchema = z.object({
  status: z.enum(['PENDING','CONFIRMED','PROCESSING','IN_DELIVERY','DELIVERED','CANCELLED']),
})
