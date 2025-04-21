import { BaseMode } from './base';

export class RefactorMode extends BaseMode {
  constructor() {
    super('refactor');
  }
}

export default new RefactorMode();