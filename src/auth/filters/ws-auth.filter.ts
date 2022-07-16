import { Catch, ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch(UnauthorizedException)
export class UnauthorizedExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    //TODO : Essayer de return directement quelque chose depuis le client
    const callback = host.getArgByIndex(2);
    if (callback && typeof callback === 'function') {
      callback({ status: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
  }
}
