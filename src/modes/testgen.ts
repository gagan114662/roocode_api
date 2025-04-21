import { BaseMode } from './base';

export class TestGenMode extends BaseMode {
  constructor() {
    super('testgen');
  }
}

export default new TestGenMode();