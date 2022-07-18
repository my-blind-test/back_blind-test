import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class QueryFailedFilter extends BaseWsExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const callback = host.getArgByIndex(2);

    if (callback && typeof callback === 'function') {
      callback({
        status: 'REQUEST_FAILED',
        content: 'This entity already exists.',
      });
    }
  }
}
