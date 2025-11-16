import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { signToken } from '../utils/jwt.js';

export default async function authRoutes(fastify) {

  /**
   * Crée un utilisateur avec son workspace par défaut
   * Retry jusqu'à 3 fois en cas d'échec
   */
  async function createUserWithWorkspace(email, hashedPassword, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const user = await prisma.$transaction(async (tx) => {
          // 1. Créer l'utilisateur
          const newUser = await tx.user.create({
            data: {
              email,
              password: hashedPassword
            }
          });

          // 2. Créer le workspace avec nom générique
          const workspace = await tx.workspace.create({
            data: {
              name: 'Mon Workspace',
              isActive: true
            }
          });

          // 3. Associer l'utilisateur au workspace comme OWNER
          await tx.userWorkspace.create({
            data: {
              userId: newUser.id,
              workspaceId: workspace.id,
              role: 'OWNER'
            }
          });

          return { user: newUser, workspace };
        });

        return user;
      } catch (error) {
        if (attempt === retries) {
          // Dernier essai échoué, on log et on lève l'erreur
          fastify.log.error({
            error,
            attempt,
            email,
            message: 'Échec de la création de l\'utilisateur et du workspace après 3 tentatives'
          });
          throw error;
        }

        // Attendre avant de réessayer (délai exponentiel)
        const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
        await new Promise(resolve => setTimeout(resolve, delay));

        fastify.log.warn({
          attempt,
          email,
          nextAttempt: attempt + 1,
          message: 'Échec de la création, nouvelle tentative...'
        });
      }
    }
  }

  /**
   * POST /register
   * Crée un nouveau compte utilisateur avec son workspace par défaut
   */
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, password } = request.body;

      // Validation basique
      if (!email || !password) {
        return reply.code(400).send({
          error: 'Email et password requis'
        });
      }

      if (password.length < 6) {
        return reply.code(400).send({
          error: 'Le password doit faire au moins 6 caractères'
        });
      }

      // Vérifie si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return reply.code(409).send({
          error: 'Cet email est déjà utilisé'
        });
      }

      // Hash le password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crée l'utilisateur avec son workspace (retry automatique)
      const { user, workspace } = await createUserWithWorkspace(email, hashedPassword);

      // Génère le token
      const token = signToken(user.id, user.email);

      return reply.code(201).send({
        message: 'Utilisateur créé avec succès',
        token,
        user: {
          id: user.id,
          email: user.email
        },
        workspaceId: workspace.id
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Erreur lors de la création du compte'
      });
    }
  });

  /**
   * POST /login
   * Authentifie un utilisateur
   */
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body;

      // Validation basique
      if (!email || !password) {
        return reply.code(400).send({
          error: 'Email et password requis'
        });
      }

      // Trouve l'utilisateur
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return reply.code(401).send({
          error: 'Email ou password incorrect'
        });
      }

      // Vérifie le password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return reply.code(401).send({
          error: 'Email ou password incorrect'
        });
      }

      // Génère le token
      const token = signToken(user.id, user.email);

      return reply.send({
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          email: user.email
        }
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Erreur lors de la connexion'
      });
    }
  });
}
