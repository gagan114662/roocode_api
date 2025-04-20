import { Request, Response, NextFunction } from 'express';

export interface RooModeHandler {
  (req: Request, res: Response, next: NextFunction): Promise<void>;
}

export interface RooMode {
  name: string;
  handler: RooModeHandler;
}

export class BaseMode implements RooMode {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const { prompt } = req.body;
      
      res.json({
        status: 'success',
        data: {
          projectId,
          mode: this.name,
          message: `${this.name} mode executed`,
          prompt
        }
      });
    } catch (error) {
      next(error);
    }
  }
}