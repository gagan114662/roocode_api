import { BaseMode } from './base';

export class ScaffoldMode extends BaseMode {
  constructor() {
    super('scaffold');
  }
}

export default new ScaffoldMode();