import Interpreter from "./Interpreter";

export interface PluginContext {
  interpreter: Interpreter;
  plugins: {
    [key: string]: Plugin;
  }
}

export interface Plugin {
  pluginId(): string;
  pluginVersion(): number;
  load(context: PluginContext): Promise<boolean>;
  beforeGenerate(context: PluginContext): Promise<boolean>;
}