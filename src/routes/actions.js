import { verifyToken } from '../utils/jwt.js';
import prisma from '../lib/prisma.js';

const N8N_HOST = process.env.N8N_HOST;
const N8N_TOKEN = process.env.N8N_TOKEN;

export default async function actionsRoutes(fastify) {

  /**
   * POST /action/:action_name
   * Proxy authentifié vers N8N
   * Supporte application/json et multipart/form-data
   */
  fastify.post('/action/:action_name', async (request, reply) => {
    try {
      // Récupère le token depuis le header Authorization
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Token manquant. Utilisez le header: Authorization: Bearer <token>'
        });
      }

      const token = authHeader.substring(7); // Retire "Bearer "

      // Vérifie le token et récupère l'utilisateur
      let user;
      try {
        user = verifyToken(token);
      } catch (error) {
        return reply.code(401).send({
          error: 'Token invalide ou expiré'
        });
      }

      // Récupère le nom de l'action depuis les paramètres
      const { action_name } = request.params;

      // Détecte le Content-Type
      const contentType = request.headers['content-type'] || '';

      let body = {};
      let files = [];

      if (contentType.includes('multipart/form-data')) {
        // Parse multipart/form-data
        const parts = await request.parts();

        for await (const part of parts) {
          if (part.type === 'file') {
            files.push({
              fieldname: part.fieldname,
              filename: part.filename,
              mimetype: part.mimetype,
              data: await part.toBuffer()
            });
          } else {
            // Champ de formulaire
            body[part.fieldname] = part.value;
          }
        }
      } else {
        // JSON standard
        body = request.body || {};
      }

      // Vérifie que workspace_id est présent
      const { workspace_id } = body;

      if (!workspace_id) {
        return reply.code(400).send({
          error: 'workspace_id requis dans le body'
        });
      }

      // Convertit workspace_id en entier si c'est une string (cas multipart)
      const workspaceIdInt = typeof workspace_id === 'string'
        ? parseInt(workspace_id, 10)
        : workspace_id;

      if (isNaN(workspaceIdInt)) {
        return reply.code(400).send({
          error: 'workspace_id doit être un nombre valide'
        });
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
        // Retourne 404 pour ne pas révéler l'existence du workspace
        return reply.code(404).send({
          error: 'Workspace non trouvé'
        });
      }

      // Ajoute les infos utilisateur au body
      const enrichedBody = {
        ...body,
        workspace_id: workspaceIdInt,
        user: {
          userId: user.userId,
          email: user.email,
          workspaceRole: userWorkspace.role
        }
      };

      // Appelle N8N
      const n8nUrl = `${N8N_HOST}/${action_name}`;

      fastify.log.info(`Proxying to N8N: ${n8nUrl} for user ${user.email}`);

      let response;

      if (files.length > 0) {
        // Multipart avec fichiers - recréer un FormData
        const formData = new FormData();

        // Ajoute les données enrichies comme JSON
        formData.append('data', JSON.stringify(enrichedBody));

        // Ajoute les fichiers
        for (const file of files) {
          const blob = new Blob([file.data], { type: file.mimetype });
          formData.append(file.fieldname, blob, file.filename);
        }

        response = await fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'X-SKY-TOKEN': N8N_TOKEN
          },
          body: formData
        });
      } else {
        // JSON standard
        response = await fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SKY-TOKEN': N8N_TOKEN
          },
          body: JSON.stringify(enrichedBody)
        });
      }

      // Récupère la réponse de N8N
      const n8nData = await response.json();

      // Retourne la même réponse avec le même status code
      return reply.code(response.status).send(n8nData);

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Erreur lors du proxy vers N8N',
        details: error.message
      });
    }
  });

  /**
   * GET /action/:action_name
   * Proxy authentifié vers N8N (version GET)
   */
  fastify.get('/action/:action_name', async (request, reply) => {
    try {
      // Récupère le token depuis le header Authorization
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Token manquant. Utilisez le header: Authorization: Bearer <token>'
        });
      }

      const token = authHeader.substring(7); // Retire "Bearer "

      // Vérifie le token et récupère l'utilisateur
      let user;
      try {
        user = verifyToken(token);
      } catch (error) {
        return reply.code(401).send({
          error: 'Token invalide ou expiré'
        });
      }

      // Récupère le nom de l'action depuis les paramètres
      const { action_name } = request.params;

      // Récupère les query parameters
      const { workspace_id, ...otherParams } = request.query;

      if (!workspace_id) {
        return reply.code(400).send({
          error: 'workspace_id requis en query parameter'
        });
      }

      // Convertit workspace_id en entier (les query params sont des strings)
      const workspaceIdInt = parseInt(workspace_id, 10);

      if (isNaN(workspaceIdInt)) {
        return reply.code(400).send({
          error: 'workspace_id doit être un nombre valide'
        });
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
        // Retourne 404 pour ne pas révéler l'existence du workspace
        return reply.code(404).send({
          error: 'Workspace non trouvé'
        });
      }

      // Construit les query params enrichis avec les infos utilisateur
      const enrichedParams = new URLSearchParams({
        ...otherParams,
        userId: user.userId,
        email: user.email,
        workspaceRole: userWorkspace.role,
        workspace_id: workspace_id
      });

      // Appelle N8N
      const n8nUrl = `${N8N_HOST}/${action_name}?${enrichedParams.toString()}`;

      fastify.log.info(`Proxying GET to N8N: ${n8nUrl} for user ${user.email}`);

      const response = await fetch(n8nUrl, {
        method: 'GET',
        headers: {
          'X-SKY-TOKEN': N8N_TOKEN
        }
      });

      // Récupère la réponse de N8N
      const n8nData = await response.json();

      // Retourne la même réponse avec le même status code
      return reply.code(response.status).send(n8nData);

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Erreur lors du proxy vers N8N',
        details: error.message
      });
    }
  });
}
