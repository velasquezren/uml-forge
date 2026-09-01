import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Introduce un correo electronico valido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Introduce un correo electronico valido'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una letra mayuscula')
    .regex(/[a-z]/, 'Debe contener al menos una letra minuscula')
    .regex(/[0-9]/, 'Debe contener al menos un numero')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un caracter especial'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
