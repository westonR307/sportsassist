
import helmet from 'helmet';
import { Express } from 'express';

export function setupSecurity(app: Express) {
  app.use(helmet());
  app.use(helmet.hidePoweredBy());
  app.use(helmet.noSniff());
  app.use(helmet.xssFilter());
  app.use(helmet.frameguard({ action: 'deny' }));
}
