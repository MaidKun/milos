export interface MazeContext {
  rooms: {[id: string]: string[]};
  deadEnds: {[id: string]: string[]};
  goals: {[id: string]: string[]};
  tags: string[];
  fetishes: {[id: string]: string};
  toys: {[id: string]: string};
}