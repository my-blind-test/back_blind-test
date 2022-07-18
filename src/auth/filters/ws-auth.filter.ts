import { Catch, ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch(UnauthorizedException)
export class UnauthorizedExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    //TODO : Essayer de return directement quelque chose depuis le client
    const callback = host.getArgByIndex(2); //TODO : is it safe ? (est-ce possible que l'ordre soit modifié, que plus d'arguments soient envoyés ?)

    if (callback && typeof callback === 'function') {
      callback({ status: 'UNAUTHORIZED', content: 'Unauthorized' });
    }
  }
}
