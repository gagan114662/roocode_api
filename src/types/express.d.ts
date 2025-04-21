import { ModeConfig } from '../config/roocodeModes';

declare global {
  namespace Express {
    interface Request {
      locals: {
        modeConfig?: ModeConfig;
        [key: string]: any;
      };
    }
  }
}