import { validationErrorWithData } from '../utils/apiResponse.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || [];
    const errors = issues.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }));
    return validationErrorWithData(res, 'Validation failed', errors);
  }
  req.body = result.data;
  next();
};
