import {Plugin as MilosPlugin} from '../milos'
import { PluginContext } from '../milos/Plugin';
import { setup, finalizeMaze } from './Commands';
import { MazeContext } from './MazeContext';
import * as fs from 'fs';
import * as path from 'path';
import { TeaseValue } from '../milos-eos';

export default class Plugin implements MilosPlugin {
  public readonly maze: MazeContext;

  constructor() {
    this.maze = {
      rooms: {},
      deadEnds: {},
      goals: {},
      tags: [],
      fetishes: {},
      toys: {}
    }
  }

  pluginId() {
    return 'milos-eos-maze';
  }

  pluginVersion() {
    return 1;
  }

  loadScript(context: PluginContext, file: string) {
    const tease = context.interpreter.root.requireContextValue<TeaseValue>('tease').tease;

    tease.appendLibScript(fs.readFileSync(path.join(__dirname, 'scripts', file), 'utf-8'));
    return true;
  }

  async load(context: PluginContext) {
    setup(context.interpreter, this.maze);

    if (!this.loadScript(context, 'global.js')
      || !this.loadScript(context, 'code.js')
      || !this.loadScript(context, 'maze.js')
      || !this.loadScript(context, 'random.js')
      || !this.loadScript(context, 'rooms.js')
    ) {
      return false;
    }

    return true;
  }

  async beforeGenerate(context: PluginContext) {
    const tease = context.interpreter.root.requireContextValue<TeaseValue>('tease').tease;
    finalizeMaze(tease, this.maze);
    return true;
  }
}
