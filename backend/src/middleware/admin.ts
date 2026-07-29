import { createMiddleware } from 'hono/factory';
import { UserDto } from '../shared/types';
import { E } from '../shared/response';

type Env = {
  Variables: {
    userId: string;
    user: UserDto;
  };
};

export const withAdmin = createMiddleware<Env>(async (c, next) => {
  const user = c.var.user;
  if (user.tier !== 'admin') return E.FORBIDDEN('Akses admin diperlukan');
  await next();
});
