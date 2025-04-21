import { Express, Request, Response, NextFunction } from 'express';
import { ModeConfig, RooModeHandler } from './roocodeModes';
import scaffold from '../modes/scaffold';
import refactor from '../modes/refactor';
import testgen from '../modes/testgen';
import cicd from '../modes/cicd';
import docgen from '../modes/docgen';

const modeHandlers = {
  scaffold,
  refactor,
  testgen,
  cicd,
  docgen
};

export interface RooModeContext {
  rooModes: Record<string, RooModeHandler>;
  modeConfigs: Record<string, ModeConfig>;
}

/**
 * Apply mode handlers to the Express application
 * @param app Express application
 * @param modes Mode configurations
 */
export function applyCustomModes(app: Express, modes: Record<string, ModeConfig>): void {
  // Initialize roo modes context in app.locals
  const context: RooModeContext = {
    rooModes: {},
    modeConfigs: modes
  };

  // Register mode handlers
  for (const [modeName, handler] of Object.entries(modeHandlers)) {
    if (!modes[modeName]) {
      console.warn(`Warning: No configuration found for mode ${modeName}`);
      continue;
    }
    
    // Create handler that combines mode config with base handler
    const configuredHandler: RooModeHandler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Add mode config to request
        req.locals = {
          ...req.locals,
          modeConfig: modes[modeName]
        };
        
        // Call mode handler
        await handler.handler(req, res, next);
      } catch (error) {
        next(error);
      }
    };

    context.rooModes[modeName] = configuredHandler;
  }

  // Attach context to app.locals
  app.locals.rooContext = context;
}