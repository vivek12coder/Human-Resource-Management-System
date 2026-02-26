// utils/sendResponse.ts
import { Response } from 'express';

interface SendResponseOptions {
  statusCode: number;
  success: boolean;
  message: string;
  data?: any;
}

const sendResponse = (res: Response, options: SendResponseOptions) => {
  const { statusCode, success, message, data } = options;
  res.status(statusCode).json({
    success,
    message,
    data: data || null,
  });
};

export default sendResponse;
