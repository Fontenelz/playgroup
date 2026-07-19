import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { createLogger } from '@playgroup/logger'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

const logger = createLogger('bootstrap')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const webOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())

  app.enableCors({
    origin: webOrigins,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  app.useGlobalFilters(new AllExceptionsFilter())

  const port = process.env.PORT ?? 3333
  await app.listen(port)
  logger.info(`playgroup api listening on http://localhost:${port}`)
}

bootstrap().catch((error) => {
  logger.error('Falha ao iniciar a aplicação — verifique as variáveis de ambiente', {
    stack: error?.stack,
    error,
  })
  process.exit(1)
})
