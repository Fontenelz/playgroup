import { randomUUID } from 'node:crypto'
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Response } from 'express'
import { Prisma } from '../../../generated/prisma'
import type { AuthenticatedRequest } from '../../auth/supabase-jwt.guard'

interface ErrorBody {
  statusCode: number
  message: string
  errorId?: string
}

/** Mapeia erros conhecidos do Prisma para respostas HTTP seguras (sem vazar nomes de coluna/tabela). */
function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
  status: number
  message: string
} {
  switch (error.code) {
    case 'P2002':
      return { status: HttpStatus.CONFLICT, message: 'Já existe um registro com esses dados' }
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Recurso não encontrado' }
    case 'P2003':
      return { status: HttpStatus.BAD_REQUEST, message: 'Referência inválida' }
    case 'P2023':
      return { status: HttpStatus.BAD_REQUEST, message: 'Identificador inválido' }
    default:
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro interno do servidor' }
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<AuthenticatedRequest>()

    const { status, message } = this.resolve(exception)
    const body: ErrorBody = { statusCode: status, message }

    if (status >= 500) {
      body.errorId = randomUUID()
    }

    this.log(exception, req, status, body.errorId)
    res.status(status).json(body)
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse()
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message)
      return {
        status: exception.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : message,
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return mapPrismaError(exception)
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { status: HttpStatus.BAD_REQUEST, message: 'Dados inválidos enviados' }
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro interno do servidor' }
  }

  private log(exception: unknown, req: AuthenticatedRequest, status: number, errorId?: string) {
    const context = `${req.method} ${req.originalUrl ?? req.url} userId=${req.user?.id ?? 'anon'}${
      errorId ? ` errorId=${errorId}` : ''
    }`
    const stack = exception instanceof Error ? exception.stack : undefined
    const message = exception instanceof Error ? exception.message : String(exception)

    if (status >= 500) {
      this.logger.error(`${context} — ${message}`, stack)
    } else {
      this.logger.warn(`${context} — ${message}`)
    }
  }
}
