import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class WsJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const auth = context.switchToWs().getClient().handshake.auth;

    return {
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    };
  }
}
