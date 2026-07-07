import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

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
  console.log(`playgroup api listening on http://localhost:${port}`)
}

bootstrap().catch((error) => {
  Logger.error(
    'Falha ao iniciar a aplicação — verifique as variáveis de ambiente',
    error?.stack ?? error,
    'Bootstrap',
  )
  process.exit(1)
})
