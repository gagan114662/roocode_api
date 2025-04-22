// src/plugins/registry.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { CodePlugin, TaskRequest } from './types';

export class PluginRegistry {
  private plugins: CodePlugin[] = [];

  constructor() {
    this.loadPlugins();
  }

  private async loadPlugins() {
    const dir = path.join(__dirname, 'plugins');
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.plugin.js') || file.endsWith('.plugin.ts')) {
          const { default: plugin } = await import(path.join(dir, file));
          this.registerPlugin(plugin);
        }
      }
    } catch (err) {
      console.warn('No plugins folder or failed to load plugins:', err);
    }
  }

  registerPlugin(plugin: CodePlugin) {
    this.plugins.push(plugin);
    console.log(`🔌 Registered plugin: ${plugin.name} v${plugin.version}`);
  }

  getPluginsForTask(request: TaskRequest): CodePlugin[] {
    return this.plugins.filter(p => p.canHandle(request));
  }
}

export const pluginRegistry = new PluginRegistry();
