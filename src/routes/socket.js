import crypto from 'crypto';
import { verifyToken } from '../utils/jwt.js';
import prisma from '../lib/prisma.js';

const PUSHER_KEY = process.env.PUSHER_KEY;
const PUSHER_SECRET = process.env.PUSHER_SECRET;

export default async function socketRoutes(fastify) {

  /**
   * POST /socket/auth?workspace_id=xx&website_id=xxx
   * Authentification Pusher/Soketi pour les channels privés
   * Body (form-urlencoded): socket_id, channel_name
   * Retourne: { auth: "key:signature" }
   */
  fastify.post('/socket/auth', async (request, reply) => {
    try {
      // Récupère le token depuis le header Authorization
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const token = authHeader.substring(7);

      // Vérifie le token et récupère l'utilisateur
      let user;
      try {
        user = verifyToken(token);
      } catch (error) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Récupère workspace_id et website_id depuis les query params
      const { workspace_id, website_id } = request.query;

      if (!workspace_id || !website_id) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const workspaceIdInt = parseInt(workspace_id, 10);
      const websiteIdInt = parseInt(website_id, 10);

      if (isNaN(workspaceIdInt) || isNaN(websiteIdInt)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Vérifie que l'utilisateur a accès au workspace
      const userWorkspace = await prisma.userWorkspace.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.userId,
            workspaceId: workspaceIdInt
          }
        }
      });

      if (!userWorkspace) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Récupère socket_id et channel_name depuis le body (envoyés par Pusher)
      const { socket_id, channel_name } = request.body || {};

      if (!socket_id || !channel_name) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Parse le channel_name: private-{entity}-{id}
      const match = channel_name.match(/^private-(\w+)-(\d+)$/);

      if (!match) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const [, entity, entityId] = match;
      const entityIdInt = parseInt(entityId, 10);

      // Vérifie l'accès à l'entité selon son type
      let hasAccess = false;

      if (entity === 'chat') {
        const chat = await prisma.chat.findFirst({
          where: {
            id: entityIdInt,
            websiteId: websiteIdInt
          }
        });

        hasAccess = !!chat;
      }

      if (!hasAccess) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Génère la signature Pusher
      const stringToSign = `${socket_id}:${channel_name}`;
      const signature = crypto
        .createHmac('sha256', PUSHER_SECRET)
        .update(stringToSign)
        .digest('hex');

      // Retourne la réponse au format Pusher
      return reply.send({
        auth: `${PUSHER_KEY}:${signature}`
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(403).send({ error: 'Forbidden' });
    }
  });
}
