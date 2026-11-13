import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Enter a valid email address' }).max(255)),
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    // bcrypt only uses the first 72 bytes, so longer passwords would give a false sense of security
    .max(72, 'Password must be at most 72 characters'),
});

export type Credentials = z.infer<typeof credentialsSchema>;
