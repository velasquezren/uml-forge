import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (typeof resObj['message'] === 'string' || Array.isArray(resObj['message'])) {
          message = resObj['message'] as string | string[];
        }
        if (typeof resObj['error'] === 'string') {
          error = resObj['error'];
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      // Los errores del lector del cuerpo (JSON mal formado, cuerpo demasiado
      // grande) traen su propio codigo 4xx: no son fallos del servidor.
      const clientStatus = (exception as Error & { status?: unknown }).status;
      if (typeof clientStatus === 'number' && clientStatus >= 400 && clientStatus < 500) {
        status = clientStatus;
        error = clientStatus === 413 ? 'Payload Too Large' : 'Bad Request';
        if (clientStatus === 413) {
          message = 'La solicitud supera el tamanno maximo admitido (12 MB)';
        }
      }
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
