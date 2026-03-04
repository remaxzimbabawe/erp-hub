import { z } from 'zod';

export const productCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().max(20, 'Code must be less than 20 characters').optional(),
});

export const productTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().max(20, 'Code must be less than 20 characters').optional(),
  productCategoryId: z.string().min(1, 'Category is required'),
  priceInCents: z.number().min(1, 'Price must be at least 1 cent'),
});

export const shopSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters'),
});

export const productSchema = z.object({
  productTemplateId: z.string().min(1, 'Product template is required'),
  shopId: z.string().min(1, 'Shop is required'),
  quantity: z.number().int('Quantity must be a whole number'),
  useDefaultPrice: z.boolean(),
  priceInCentsAtShop: z.number().min(0).optional(),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phoneNumber: z.string().trim().min(1, 'Phone number is required').max(20, 'Phone number must be less than 20 characters'),
  shopId: z.string().min(1, 'Shop is required'),
});

export const notificationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  whatsAppPhoneNumber: z.string().trim().min(1, 'WhatsApp number is required').max(20, 'Phone number must be less than 20 characters'),
});

export const cashierLoginSchema = z.object({
  name: z.string().trim().min(1, 'Cashier name is required').max(50, 'Name must be less than 50 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const userFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').max(100, 'Password must be less than 100 characters'),
  isActive: z.boolean(),
  role: z.enum(['super_admin', 'manager', 'shop_manager', 'app_user']),
});

export type ProductCategoryFormData = z.infer<typeof productCategorySchema>;
export type ProductTemplateFormData = z.infer<typeof productTemplateSchema>;
export type ShopFormData = z.infer<typeof shopSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type NotificationFormData = z.infer<typeof notificationSchema>;
export type CashierLoginFormData = z.infer<typeof cashierLoginSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type UserFormData = z.infer<typeof userFormSchema>;
