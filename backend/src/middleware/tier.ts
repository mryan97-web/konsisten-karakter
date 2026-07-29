import { createMiddleware } from 'hono/factory';
import { UserDto } from '../shared/types';
import { E } from '../shared/response';

type Env = {
  Variables: {
    userId: string;
    user: UserDto;
  };
};

export const withTier = (...allowedTiers: string[]) =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.var.user;
    if (!allowedTiers.includes(user.tier)) {
      return E.TIER_LIMIT(
        `Fitur ini membutuhkan tier: ${allowedTiers.join(', ')}`,
        allowedTiers.join(', ')
      );
    }
    await next();
  });
