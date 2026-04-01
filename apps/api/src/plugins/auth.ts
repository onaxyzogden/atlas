import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../lib/config.js';
import { UnauthorizedError } from '../lib/errors.js';

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId: string;
    userEmail: string;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  fastify.decorate(
    'authenticate',
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = await req.jwtVerify<JwtPayload>();
        req.userId = payload.sub;
        req.userEmail = payload.email;
      } catch {
        throw new UnauthorizedError('Invalid or expired token');
      }
    },
  );
});
