// pages/api/auth/[...nextauth].ts

import NextAuth from 'next-auth';
import { authConfig } from '../../../auth.config'; // Ajusta la ruta si es necesario
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres'; // O lo que uses para la DB

// Función para obtener el usuario desde la base de datos
async function getUser(email: string) {
  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export default NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validación de las credenciales con Zod
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email); // Busca el usuario en la base de datos

          if (!user) return null; // Si no existe el usuario, retorna null

          // Compara las contraseñas
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user; // Si las contraseñas coinciden, retorna el usuario
        }
        console.log('Invalid credentials');
        return null; // Si las credenciales son incorrectas, retorna null
      },
    }),
  ],
});
