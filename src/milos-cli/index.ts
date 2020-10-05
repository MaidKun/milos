import yargs from 'yargs';
import * as fs from 'fs';
import { Interpreter, ScriptParser } from '../milos';
import { PluginContext } from '../milos/Plugin';

import MilosEosPlugin, { TeaseValue } from '../milos-eos';
import MilosEosVariablePlugin from '../milos-eos-variable';
import MilosEosMazePlugin from '../milos-eos-maze';

// Returns the options from the command line
function getRawOptions() {
  return yargs
    .string('module')
    .describe('module', 'Loads a MILOS module')
    .alias('m', 'module')
    
    .string('js')
    .describe('js', 'Adds a JavaScript file')
    .alias('s', 'js')

    .string('output')
    .describe('output', 'Define where to store the result')
    .alias('o', 'output')

    .alias('h', 'help')
    .help('help')
    .argv;
}

// Requires an array
function toArray(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

// Returns all options
function getOptions() {
  const {_, module, js, output} = getRawOptions();

  return {
    input: _,
    modules: ['milos-eos'].concat(toArray(module || [])),
    scripts: js || [],
    output: output || 'output.json'
  }
}

// Resolves a plugin
function resolvePlugIn(id: string) {
  switch (id) {
    case 'milos-eos': return MilosEosPlugin;
    case 'milos-eos-variable': return MilosEosVariablePlugin;
    case 'milos-eos-maze': return MilosEosMazePlugin;

    default:
      throw new Error(`Unable to resolve module: ${id}`);
  }
}

// Executes the CLI
async function run() {
  const interpreter = new Interpreter();
  const context: PluginContext = {interpreter, plugins: {}};
  const options = getOptions();

  // Loads all modules
  for (const mod of options.modules) {
    const Klass = resolvePlugIn(mod);
    const plugin = new Klass();

    if (!context.plugins.hasOwnProperty(plugin.pluginId())) {
      if (!await plugin.load(context)) {
        throw new Error(`Unable to load plugin ${mod}`);
      }

      context.plugins[plugin.pluginId()] = plugin;
    }
  }

  // Parses all files
  for (const file of options.input) {
    const parser = new ScriptParser();
    const script = parser.parse(fs.readFileSync(file, 'utf8'), file);
    interpreter.run(script);
  }

  // Finalize all plugins
  for (const plugin of Object.values(context.plugins)) {
    if (!await plugin.beforeGenerate(context)) {
      throw new Error(`Unable to finalize plugin ${plugin.pluginId()}`);
    }
  }

  // Adds all scripts
  const tease = interpreter.root.requireContextValue<TeaseValue>('tease').tease;
  for (const script of options.scripts) {
    tease.appendLibScript(fs.readFileSync(script, 'utf-8'));
  }
  tease.flatten();

  // Write output
  fs.writeFileSync(options.output, JSON.stringify(tease.asJson(), undefined, '  '));
}

export default run;
