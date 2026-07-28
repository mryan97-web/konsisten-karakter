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

export const withTier = (...allowedTiers: string[]) =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.var.user;
    if (!allowedTiers.includes(user.tier)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'TIER_LIMIT',
            message: `Fitur ini membutuhkan tier: ${allowedTiers.join(', ')}`,
            details: { current_tier: user.tier, required_tier: allowedTiers },
          },
        },
        403,
      );
    }
    await next();
  });
