import { z } from 'zod';

// Authentication validation schemas
export const signupSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(100, 'Senha muito longa'),
  fullName: z.string().trim().max(100, 'Nome muito longo').optional(),
  preferredName: z.string().trim().max(50, 'Apelido muito longo').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(1, 'Senha obrigatória').max(100, 'Senha muito longa'),
});

// NeuroCoach message validation
export const coachMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1, 'Mensagem não pode estar vazia').max(2000, 'Mensagem muito longa'),
  })).min(1, 'Pelo menos uma mensagem é necessária'),
  stressLevel: z.enum(['low', 'moderate', 'high']),
  context: z.string().max(1000).optional(),
  userName: z.string().max(100).optional(),
  hrvValue: z.number().min(0).max(200).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CoachMessageInput = z.infer<typeof coachMessageSchema>;
