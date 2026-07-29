import { createMiddleware } from 'hono/factory';

type Env = {
  Variables: {
    userId: string;
    user: {
      user_id: string;
      email: string;
      tier: string;
    };
  };
};

export const withAdmin = createMiddleware<Env>(async (c, next) => {
  const user = c.var.user;

  if (user.tier !== 'admin') {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Akses admin diperlukan' },
      },
      403,
    );
  }

  await next();
});
