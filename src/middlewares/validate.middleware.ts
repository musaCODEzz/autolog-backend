import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Generic validation middleware factory for AutoLog KE.
 * Validates req.body against any provided Zod schema.
 *
 * @param schema - The Zod schema to validate against
 */
export const validate = (schema: ZodType) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            // 1. Run schema validation asynchronously
            const result = await schema.safeParseAsync(req.body);

            // 2. If validation fails, return a formatted 400 Bad Request
            if (!result.success) {
                const errors = result.error.issues.map((issue) => ({
                    field: issue.path.join('.') || 'body',
                    message: issue.message,
                }));

                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
                return;
            }

            // 3. Replace req.body with the sanitized and defaulted data from Zod
            req.body = result.data;

            // 4. Pass control to the next middleware or controller
            next();
        } catch (error) {
            next(error);
        }
    };
};

export default validate;
