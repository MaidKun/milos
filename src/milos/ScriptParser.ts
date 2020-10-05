import {parse} from "./grammar";
import Script from "./Script";

export default class ScriptParser {
  static currentFile?: string;

  parse(script: string, fileName: string): Script {
    try {
      ScriptParser.currentFile = fileName;
      const result = parse(script);
      ScriptParser.currentFile = undefined;
      return new Script(result, fileName);
    } catch(err) {
      console.error(`Error in ${fileName}: ${err.toString()}`)
      throw err;
    }
  }
}
