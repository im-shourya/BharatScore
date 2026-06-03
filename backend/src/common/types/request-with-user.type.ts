import { Request } from 'express';
import { JwtPayload } from './jwt-payload.type';

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
