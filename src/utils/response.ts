import { Response } from 'express';
import { PaginatedResult } from '../types';

export class ApiResponse {
  static success<T>(res: Response, data?: T, message = 'تمت العملية بنجاح', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== undefined ? { data } : {})
    });
  }

  static paginated<T>(
    res: Response,
    items: T[],
    page: number,
    limit: number,
    total: number,
    message = 'تم جلب البيانات بنجاح'
  ) {
    const totalPages = Math.ceil(total / limit) || 1;
    const responsePayload: PaginatedResult<T> = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    return res.status(200).json({
      success: true,
      message,
      data: responsePayload
    });
  }

  static error(res: Response, message: string, code: string, statusCode = 400, details?: unknown) {
    return res.status(statusCode).json({
      success: false,
      message,
      code,
      ...(details !== undefined ? { details } : {})
    });
  }
}
