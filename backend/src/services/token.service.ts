import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { ActorType } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';

const ISSUER = 'live-chat';

export interface TokenClaims {
  /** Operator or customer id. */
  sub: string;
  typ: ActorType;
  /** Must match the account's tokenVersion; bumping it revokes older tokens. */
  ver: number;
}

/** Signs and verifies the HS256 JWTs both apps send as `Authorization: Bearer`. */
export class TokenService {
  sign(claims: TokenClaims) {
    const expiresIn = (claims.typ === 'OPERATOR' ? env.jwt.operatorTtl : env.jwt.customerTtl) as SignOptions['expiresIn'];
    return jwt.sign({ typ: claims.typ, ver: claims.ver }, env.jwt.secret, {
      algorithm: 'HS256',
      subject: claims.sub,
      issuer: ISSUER,
      expiresIn,
    });
  }

  verify(token: string): TokenClaims {
    try {
      const payload = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'], issuer: ISSUER });
      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        (payload.typ !== 'OPERATOR' && payload.typ !== 'CUSTOMER') ||
        typeof payload.ver !== 'number'
      ) {
        throw new Error('Malformed token');
      }
      return { sub: payload.sub, typ: payload.typ, ver: payload.ver };
    } catch (err) {
      throw HttpError.unauthorized(err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token');
    }
  }
}
