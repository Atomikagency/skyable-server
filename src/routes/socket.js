import { verifyToken } from '../utils/jwt.js';
import prisma from '../lib/prisma.js';

export default async function socketRoutes(fastify) {

  /**
   * POST /socket/auth?workspace_id=xx&website_id=xxx
   * Authentification pour les channels WebSocket privés
   * Body: { "channel_name": "private-chat-8" }
   */
  fastify.post('/socket/auth', async (request, reply) => {
    try {
      // Récupère le token depuis le header Authorization
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.send({ authorized: false });
      }

      const token = authHeader.substring(7);

      // Vérifie le token et récupère l'utilisateur
      let user;
      try {
        user = verifyToken(token);
      } catch (error) {
        return reply.send({ authorized: false });
      }

      // Récupère workspace_id et website_id depuis les query params
      const { workspace_id, website_id } = request.query;

      if (!workspace_id || !website_id) {
        return reply.send({ authorized: false });
      }

      const workspaceIdInt = parseInt(workspace_id, 10);
      const websiteIdInt = parseInt(website_id, 10);

      if (isNaN(workspaceIdInt) || isNaN(websiteIdInt)) {
        return reply.send({ authorized: false });
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
        return reply.send({ authorized: false });
      }

      // Récupère le channel_name depuis le body
      const { channel_name } = request.body || {};

      if (!channel_name) {
        return reply.send({ authorized: false });
      }

      // Parse le channel_name: private-{entity}-{id}
      const match = channel_name.match(/^private-(\w+)-(\d+)$/);

      if (!match) {
        return reply.send({ authorized: false });
      }

      const [, entity, entityId] = match;
      const entityIdInt = parseInt(entityId, 10);

      // Vérifie l'accès à l'entité selon son type
      if (entity === 'chat') {
        const chat = await prisma.chat.findFirst({
          where: {
            id: entityIdInt,
            websiteId: websiteIdInt
          }
        });

        return reply.send({ authorized: !!chat });
      }

      // Entité non supportée
      return reply.send({ authorized: false });

    } catch (error) {
      fastify.log.error(error);
      return reply.send({ authorized: false });
    }
  });
}
