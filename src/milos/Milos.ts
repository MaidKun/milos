import ScriptParser from "./ScriptParser";

export interface NodeLocation {
  line: number;
  column: number;
}

export class Node {
  protected location?: NodeLocation;
  protected locationFile?: string;

  constructor() {
  }

  setLocation(location: NodeLocation) {
    this.location = location;
    this.locationFile = ScriptParser.currentFile;
  }

  getLocation() {
    return this.location;
  }

  locationString() {
    if (!this.location || !this.locationFile) {
      return '';
    }

    return `${this.locationFile}(${this.location.line}:${this.location.column}): `
  }

  error(msg: string) {
    console.error(this.locationString() + msg);
  }
}