import { BaseMode } from './base';

export class CICDMode extends BaseMode {
  constructor() {
    super('cicd');
  }
}

export default new CICDMode();