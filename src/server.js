import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import authRoutes from './routes/auth.js';
import actionsRoutes from './routes/actions.js';

// Configuration du serveur
const PORT = process.env.PORT || 3000;

// Création de l'instance Fastify
const fastify = Fastify({
  logger: true
});

// Enregistrement des plugins
await fastify.register(cors, {
  origin: '*'
});

await fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET
});

await fastify.register(fastifyWebsocket);

await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Route de test
fastify.get('/', async () => {
  return {
    message: 'API Skyable',
    endpoints: {
      register: 'POST /register',
      login: 'POST /login',
      websocket: 'GET /ws?token=xxx',
      action: 'POST /action/:action_name (authentifié)'
    }
  };
});

// Enregistrement des routes
await fastify.register(authRoutes);
await fastify.register(actionsRoutes);

// Démarrage du serveur
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
