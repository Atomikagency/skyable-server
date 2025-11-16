import Pusher from 'pusher';

const N8N_TOKEN = process.env.N8N_TOKEN;

// Configuration Pusher/Soketi
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  host: process.env.PUSHER_HOST,
  port: process.env.PUSHER_PORT || '6001',
  useTLS: process.env.PUSHER_USE_TLS === 'true'
});

export default async function adminRoutes(fastify) {

  /**
   * POST /admin/push
   * Push un message vers Soketi/Pusher
   * Auth: X-SKY-TOKEN header (N8N_TOKEN)
   */
  fastify.post('/admin/push', async (request, reply) => {
    try {
      // Vérifier l'authentification via X-SKY-TOKEN
      const token = request.headers['x-sky-token'];

      if (!token || token !== N8N_TOKEN) {
        return reply.code(401).send({
          error: 'Token invalide ou manquant. Utilisez le header: X-SKY-TOKEN'
        });
      }

      // Récupérer les données du body
      const { channel, event, message } = request.body || {};

      if (!channel) {
        return reply.code(400).send({
          error: 'channel requis dans le body'
        });
      }

      if (!event) {
        return reply.code(400).send({
          error: 'event requis dans le body'
        });
      }

      if (message === undefined) {
        return reply.code(400).send({
          error: 'message requis dans le body'
        });
      }

      // Push vers Soketi/Pusher
      fastify.log.info(`Pushing to channel ${channel}, event ${event}`);

      await pusher.trigger(channel, event, message);

      return reply.send({
        success: true,
        channel,
        event
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Erreur lors du push vers Soketi',
        details: error.message
      });
    }
  });
}
