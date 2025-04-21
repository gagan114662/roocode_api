import { BaseMode } from './base';

export class DocGenMode extends BaseMode {
  constructor() {
    super('docgen');
  }
}

export default new DocGenMode();