import {Plugin as MilosPlugin} from '../milos'
import { PluginContext } from '../milos/Plugin';
import { setup } from './Commands';

export default class Plugin implements MilosPlugin {
  pluginId() {
    return 'milos-eos-variable';
  }

  pluginVersion() {
    return 1;
  }

  async load(context: PluginContext) {
    setup(context.interpreter);
    return true;
  }

  async beforeGenerate(context: PluginContext) {
    return true;
  }
}
