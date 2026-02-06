import { z } from 'zod';

// Authentication validation schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email').max(255, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
  fullName: z.string().trim().max(100, 'Name too long').optional(),
  preferredName: z.string().trim().max(50, 'Nickname too long').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email').max(255, 'Email too long'),
  password: z.string().min(1, 'Password required').max(100, 'Password too long'),
});

// NeuroCoach message validation
export const coachMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  })).min(1, 'At least one message is required'),
  stressLevel: z.enum(['low', 'moderate', 'high']),
  context: z.string().max(1000).optional(),
  userName: z.string().max(100).optional(),
  hrvValue: z.number().min(0).max(200).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CoachMessageInput = z.infer<typeof coachMessageSchema>;
