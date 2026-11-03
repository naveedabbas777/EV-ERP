import { z } from 'zod';

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').refine((value) => strongPassword.test(value), {
    message: 'Password must contain uppercase, lowercase, a number, and a special character.',
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  token: z.string().min(12, 'Reset token is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const dealerSchema = z.object({
  name: z.string().min(2, 'Dealer name is required.'),
  registrationNumber: z.string().min(2, 'Registration number is required.'),
  region: z.string().min(2, 'Region is required.'),
  contactEmail: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
  phone: z.string().min(7, 'Phone number is required.'),
  status: z.enum(['Active', 'Pending', 'Suspended']).default('Active'),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Product name is required.'),
  sku: z.string().trim().min(2, 'Product SKU is required.'),
  category: z.string().trim().min(1, 'Category is required.').default('General'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  purchasePrice: z.coerce.number().positive('Purchase price must be greater than zero.'),
  dealerPrice: z.coerce.number().positive('Dealer price must be greater than zero.'),
  retailPrice: z.coerce.number().positive('Retail price must be greater than zero.'),
  isActive: z.boolean().optional().default(true),
});

export const saleSchema = z.object({
  dealerId: z.string().min(1, 'Dealer is required.'),
  product: z.string().min(1, 'Product is required.'),
  quantity: z.number().int().positive('Quantity must be positive.'),
  unitPrice: z.number().positive('Unit price must be positive.'),
  discount: z.number().min(0).max(100).default(0),
});

export const returnSchema = z.object({
  dealerId: z.string().min(1, 'Dealer is required.'),
  product: z.string().min(1, 'Product is required.'),
  quantity: z.number().int().positive('Quantity must be positive.'),
  reason: z.string().min(10, 'Describe the defect in at least 10 characters.'),
});
