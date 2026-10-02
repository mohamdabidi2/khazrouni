import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Assign parsed values back to request
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query as typeof req.query;
      if (parsed.params) req.params = parsed.params as typeof req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map(err => ({
          field: err.path.join('.').replace(/^(body|query|params)\./, ''),
          message: err.message
        }));
        const firstMessage = issues[0]?.message || 'بيانات غير صالحة';
        return next(new ValidationError(firstMessage, issues));
      }
      next(error);
    }
  };
};
