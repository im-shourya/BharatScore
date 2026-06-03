import { Role } from '../enums/role.enum';

export interface JwtPayload {
  /** User UUID */
  sub: string;
  /** JWT unique ID — used for blacklisting */
  jti: string;
  /** User role */
  role: Role;
  /** User locale (en, hi, ta, te, mr, bn) */
  locale: string;
  /** Issuer */
  iss: string;
  /** Audience */
  aud: string;
  /** Issued at (epoch seconds, added by JWT lib) */
  iat?: number;
  /** Expiration (epoch seconds, added by JWT lib) */
  exp?: number;
}
