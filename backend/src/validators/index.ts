import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email').max(191);
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const personName = z.string().trim().min(1, 'Name is required').max(60);

export const operatorLoginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const customerLoginSchema = z.object({
  name: personName,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{6,20}$/, 'Enter a valid phone number')
    .transform((p) => p.replace(/[\s-]/g, '')),
});

export const createOperatorSchema = z.object({
  email,
  name: personName,
  password,
  role: z.enum(['ADMIN', 'OPERATOR']).default('OPERATOR'),
});

export const updateOperatorSchema = z
  .object({
    name: personName.optional(),
    role: z.enum(['ADMIN', 'OPERATOR']).optional(),
    isActive: z.boolean().optional(),
    password: password.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const updateConversationSchema = z
  .object({
    status: z.enum(['OPEN', 'DONE']).optional(),
    assigneeId: z.string().nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.assigneeId !== undefined, 'Nothing to update');

export const inboxQuerySchema = z.object({
  filter: z.enum(['all', 'unread', 'mine', 'done']).default('all'),
  search: z.string().trim().max(60).optional().transform((s) => s || undefined),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

/** Content may be empty when the message carries attachments; the service enforces that rule. */
export const sendMessageSchema = z.object({
  content: z.string().trim().max(2000).default(''),
});

export const textMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: z.string().optional(),
});

export const reactionSchema = z.object({
  emoji: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^\p{Extended_Pictographic}/u, 'Reaction must be an emoji'),
});
