function padEnd(str, len) {
  while (str.length < len) {
    str += ' ';
  }
  return str;
}

function mazePrint(m, withHtml) {
  var dirs = 'x╨╥║╡╝╗╣╞╚╔╠═╩╦╬'

  var rows=[];
  for (var y=0; y<m.size.height; y++) {
    var row='';
    var rooms='';
    for (var x=0; x<m.size.width; x++) {
      var dir = m.maze[y][x].dir;
      var room = m.maze[y][x].room;
      var before = '';
      var after = '';

      if (withHtml) {
        if (x == curPos.x && y == curPos.y) {
          before = '<span style="color:#7ef062">';
          after = '</span>'
        } else if (m.maze[y][x].goal) {
          before = '<span style="color:#627ef0">';
          after = '</span>'
        }
      }

      row += before + dirs[dir] + after;// + ((dir & MAZE_DIR_RIGHT) ? '' : '');
      rooms += before + padEnd(room ? room.toString() : '-----', 9) + "| " + after;
    }
    rows.push(row + " : " + rooms);
  }

  return rows.join("\n");
}

function mazePrintHtml(m) {
  return mazePrint(m, true).replace(/\n/g, '<br/>');
}

function mazeCreateEmpty(width, height) {
  var maze=[];
  for (var y=0; y<height; y++) {
    var row=[];
    for (var x=0; x<width; x++) {
      row.push({dir: 0, room: x+y*width});
    }
    maze.push(row);
  }
  return maze;
}

function mazePosInRange(rnd, centerX, centerY, width, height) {
  return {
    x: centerX - (width >> 1) + Math.floor(rnd.nextFloat() * width),
    y: centerY - (height >> 1) + Math.floor(rnd.nextFloat() * height)
  };
}

function mazeHashPos(pos) {
  return pos.x + ":" + pos.y;
}

function mazeIsDeadEnd(pos) {
  return pos == 1 || pos == 2 || pos == 4 || pos == 8;
}

function mazeAddDir(context, pos, dirs) {
  if (pos.x < 0 || pos.x >= context.size.width) { return; }
  if (pos.y < 0 || pos.y >= context.size.height) { return; }

  var addDir = (context.maze[pos.y][pos.x].dir ^ dirs) & dirs;
  if (!addDir) { return; }

  if (pos.y == 0) { addDir &= ~MAZE_DIR_UP; }
  if (pos.x == 0) { addDir &= ~MAZE_DIR_LEFT; }
  if (pos.y == context.size.height - 1) { addDir &= ~MAZE_DIR_DOWN; }
  if (pos.x == context.size.width - 1) { addDir &= ~MAZE_DIR_RIGHT; }

  context.maze[pos.y][pos.x].dir |= addDir;

  if (addDir & MAZE_DIR_UP) { mazeAddDir(context, {x: pos.x, y: pos.y - 1}, MAZE_DIR_DOWN); }
  if (addDir & MAZE_DIR_DOWN) { mazeAddDir(context, {x: pos.x, y: pos.y + 1}, MAZE_DIR_UP); }
  if (addDir & MAZE_DIR_LEFT) { mazeAddDir(context, {x: pos.x - 1, y: pos.y}, MAZE_DIR_RIGHT); }
  if (addDir & MAZE_DIR_RIGHT) { mazeAddDir(context, {x: pos.x + 1, y: pos.y}, MAZE_DIR_LEFT); }
  
  var newDir = context.maze[pos.y][pos.x].dir;
  if (mazeIsDeadEnd(newDir)) {
    context.unfollowedDeadEnds[mazeHashPos(pos)] = pos;
  } else {
    delete context.unfollowedDeadEnds[mazeHashPos(pos)];
  }
}

function mazePositionInAxis(rnd, size, pos) {
  var partialSize = Math.floor(size / 3);
  var partialStart = (pos === 0) ? 0 : size - partialSize;
  return Math.floor(rnd.nextFloat() * partialSize) + partialStart;
}

function mazePlaceGoal(context, pageId, index) {
  if (index >= MAZE_GOAL_ADD_EDGE.length) {
    return;
  }
  
  var edge = MAZE_GOAL_ADD_EDGE[index];
  var x = mazePositionInAxis(context.rnd, context.size.width, edge[0]);
  var y = mazePositionInAxis(context.rnd, context.size.height, edge[1]);

  context.maze[y][x].goal = true;
  context.goals.push({x:x,y:y});
}

function mazePossibleDirs(context, pos) {
  var result = [];
  var isDir = context.maze[pos.y][pos.x].dir;

  if (!(isDir & MAZE_DIR_LEFT) && pos.x > 0 && !context.maze[pos.y][pos.x-1].goal) { result.push(MAZE_DIR_LEFT); }
  if (!(isDir & MAZE_DIR_UP) && pos.y > 0 && !context.maze[pos.y-1][pos.x].goal) { result.push(MAZE_DIR_UP); }
  if (!(isDir & MAZE_DIR_RIGHT) && pos.x < context.size.width - 1 && !context.maze[pos.y][pos.x+1].goal) { result.push(MAZE_DIR_RIGHT); }
  if (!(isDir & MAZE_DIR_DOWN) && pos.y < context.size.height - 1 && !context.maze[pos.y+1][pos.x].goal) { result.push(MAZE_DIR_DOWN); }

  return result;
}

function mazePossibleNewDirs(context, pos) {
  var is = context.maze[pos.y][pos.x];
  if (is.goal) {
    delete context.unfollowedDeadEnds[mazeHashPos(pos)];
    return [];
  }
  
  var result = [];
  if (pos.x > 0 && context.maze[pos.y][pos.x-1].dir == 0) { result.push(MAZE_DIR_LEFT); }
  if (pos.y > 0 && context.maze[pos.y-1][pos.x].dir == 0) { result.push(MAZE_DIR_UP); }
  if (pos.x < context.size.width - 1 && context.maze[pos.y][pos.x+1].dir == 0) { result.push(MAZE_DIR_RIGHT); }
  if (pos.y < context.size.height - 1 && context.maze[pos.y+1][pos.x].dir == 0) { result.push(MAZE_DIR_DOWN); }

  if (result.length == 0) {
    delete context.unfollowedDeadEnds[mazeHashPos(pos)];
  }

  return result;
}

function mazeFollowDeadEnd(context, pos) {
  var dirs = mazePossibleNewDirs(context, pos);

  if (!dirs.length) {
    return;
  }


  var dir = dirs[Math.floor(context.rnd.nextFloat() * dirs.length)];
  mazeAddDir(context, pos, dir);
}

function mazeFollowDeadEnds(context) {
  var keys;
  while ((keys = Object.keys(context.unfollowedDeadEnds)).length) {
    var anyKey = keys[Math.floor(context.rnd.nextFloat() * keys.length)];
    var pos = context.unfollowedDeadEnds[anyKey];
    mazeFollowDeadEnd(context, pos);
  }
}

function mazeFollowGoals(context) {
  for (var i=0; i<context.goals.length; i++) {
    var pos = context.goals[i];
    var is = context.maze[pos.y][pos.x];
    
    if (is.dir != 0) {
      continue;
    }

    mazeFollowFromPoint(context, pos, {}, true);
  }
}

function mazePosInDir(pos, dir) {
  switch (dir) {
    case MAZE_DIR_UP: return {x: pos.x, y: pos.y - 1};
    case MAZE_DIR_DOWN: return {x: pos.x, y: pos.y + 1};
    case MAZE_DIR_LEFT: return {x: pos.x - 1, y: pos.y};
    case MAZE_DIR_RIGHT: return {x: pos.x + 1, y: pos.y};
  }
}

function mazeResumeFollowFromPoint(context, ownPoints) {
  var keys = Object.keys(ownPoints);
  var testedPoints = {}

  while (keys.length) {
    var key = keys.splice(Math.floor(context.rnd.nextFloat() * keys.length), 1)[0];
    if (testedPoints.hasOwnProperty(key)) {
      continue;
    }

    testedPoints[key] = true;
    if (mazeFollowFromPoint(context, ownPoints[key], ownPoints, false)) {
      return true;
    }

    keys = Object.keys(ownPoints);
  }

  return false;
}

function mazeFollowFromPoint(context, pos, ownPoints, tryAnotherPath) {
  do {
    ownPoints[mazeHashPos(pos)] = pos;
    var dirs = mazePossibleDirs(context, pos);
    if (!dirs.length) {
      return false;
    }

    var dir, newPos;
    do {
      if (!dirs.length) {
        if (tryAnotherPath) {
          return mazeResumeFollowFromPoint(context, ownPoints);
        } else {
          return false;
        }
      }

      dir = dirs.splice(Math.floor(context.rnd.nextFloat() * dirs.length), 1)[0];
      newPos = mazePosInDir(pos, dir);
    } while(ownPoints.hasOwnProperty(mazeHashPos(newPos)));

    var lastPoint = context.maze[newPos.y][newPos.x].dir != 0;
    mazeAddDir(context, pos, dir);
    pos = newPos;
  } while (!lastPoint);

  return true;
}

function mazeFillEmptyRooms(context) {
  var rooms = [];
  for (var y=0; y<context.size.height; y++) {
    for (var x=0; x<context.size.width; x++) {
      if (context.maze[y][x].dir == 0) {
        rooms.push({x: x, y: y})
      }
    }
  }

  for (var i=0; i<rooms.length; i++) {
    var pos = rooms[i];
    if (context.maze[pos.y][pos.x].dir != 0) {
      continue;
    }

    mazeFollowFromPoint(context, pos, {}, true);
  }
}

function mazeListDeadEnds(context) {
  var result = {};
  for (var y=0; y<context.size.height; y++) {
    for (var x=0; x<context.size.width; x++) {
      if (mazeIsDeadEnd(context.maze[y][x].dir) && !context.maze[y][x].goal) {
        var pos = {x:x, y:y};
        result[mazeHashPos(pos)] = pos;
      }
    }
  }
  return result;
}

function arrayShuffle(array, rnd) {
  if (!rnd) {
    rnd = new RNG(randomSeed());
  }
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(rnd.nextFloat() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function mazeNearDeadEnds(hash, pos) {
  var result=[];
  if (hash.hasOwnProperty(mazeHashPos({x: pos.x-1, y: pos.y}))) { result.push(MAZE_DIR_LEFT)};
  if (hash.hasOwnProperty(mazeHashPos({x: pos.x+1, y: pos.y}))) { result.push(MAZE_DIR_RIGHT)};
  if (hash.hasOwnProperty(mazeHashPos({x: pos.x, y: pos.y-1}))) { result.push(MAZE_DIR_UP)};
  if (hash.hasOwnProperty(mazeHashPos({x: pos.x, y: pos.y+1}))) { result.push(MAZE_DIR_DOWN)};
  return result;
}

function mazeMinimizeDeadEnds(context, maxCount) {
  mazeMinimizeDeadEndsByClose(context);
  mazeMinimizeDeadEndsByConnect(context, maxCount);
}

function mazeMinimizeDeadEndsByConnect(context, maxCount) {
  var deadEnds = mazeListDeadEnds(context);
  var deadEndKeys = Object.keys(deadEnds);
  var unconnectCount = 0;

  while ((unconnectCount + deadEndKeys.length) > maxCount && deadEndKeys.length) {
    var key = deadEndKeys.splice(Math.floor(context.rnd.nextFloat() * deadEndKeys.length), 1);
    var dirs = mazePossibleDirs(context, deadEnds[key]);

    if (!dirs.length) {
      unconnectCount++;
      continue;
    }

    mazeAddDir(context, deadEnds[key], dirs[Math.floor(context.rnd.nextFloat() * dirs.length)]);
  }

  if ((deadEndKeys.length + unconnectCount) !== maxCount) {
    console.log('Warning: Missing ' + (maxCount - (deadEndKeys.length + unconnectCount)) + ' dead ends');
  }
}

function mazeMinimizeDeadEndsByClose(context) {
  var deadEnds = mazeListDeadEnds(context);
  var deadEndKeys = arrayShuffle(Object.keys(deadEnds), context.rnd);

  // Try dead ends with neighbours
  for (var i=0; i<deadEndKeys.length; i++) {
    var pos = deadEnds[deadEndKeys[i]];
    
    if (!mazeIsDeadEnd(context.maze[pos.y][pos.x].dir)) {
      continue;
    }

    var nearDir = mazeNearDeadEnds(deadEnds, pos);
    if (!nearDir.length) {
      continue;
    }

    mazeAddDir(context, pos, nearDir[Math.floor(context.rnd.nextFloat() * nearDir.length)]);
  }
}

function mazeDirToArray(dir) {
  var result=[];
  if (dir & MAZE_DIR_UP) {result.push(MAZE_DIR_UP);}
  if (dir & MAZE_DIR_LEFT) {result.push(MAZE_DIR_LEFT);}
  if (dir & MAZE_DIR_RIGHT) {result.push(MAZE_DIR_RIGHT);}
  if (dir & MAZE_DIR_DOWN) {result.push(MAZE_DIR_DOWN);}
  return result;
}

function mazeListPathsWithComplexity(context, complexity) {
  var result = {};
  for (var y=0; y<context.size.height; y++) {
    for (var x=0; x<context.size.width; x++) {
      if (mazeDirToArray(context.maze[y][x].dir).length === complexity) {
        var pos = {x:x, y:y};
        result[mazeHashPos(pos)] = pos;
      }
    }
  }
  return result;
}

function mazeDirsNoDeadEnds(context, pos, dirs) {
  return dirs.filter(function(dir) {
    var testPos = mazePosInDir(pos, dir);
    var testIs = context.maze[testPos.y][testPos.x];
    return !mazeIsDeadEnd(testIs.dir);
  })
}

function mazeMinimizeStraightPaths(context, goal) {
  var map = mazeListPathsWithComplexity(context, 2);
  var list = Object.keys(map);
  var maxItems = Math.round(context.size.width * context.size.height * goal);

  while (list.length > maxItems) {
    var key = list.splice(Math.floor(context.rnd.nextFloat() * list.length), 1)[0];
    var pos = map[key];

    if (mazeDirToArray(context.maze[pos.y][pos.x].dir).length !== 2) {
      continue;
    }

    var dirs = mazeDirsNoDeadEnds(context, pos, mazePossibleDirs(context, pos));
    if (!dirs.length) {
      continue;
    }

    var addDir = dirs[Math.floor(context.rnd.nextFloat() * dirs.length)];
    mazeAddDir(context, pos, addDir);
  }
}

function mazeAddRooms(maze, rooms) {
  var ar = randomArray(rooms, maze.seed);

  var i=0;
  for (var y=0; y<maze.size.height; y++) {
    for (var x=0; x<maze.size.width; x++) {
      maze.maze[y][x].room = ar[i++];
    }
  }
}

function mazeInitRooms(maze, goals, deadEnds, rooms) {
  mazeAddRooms(maze, rooms);

  maze.maze[maze.start.y][maze.start.x].room = 'entrance';

  goals = randomArray(goals.slice(), maze.seed);
  for (var i=0; i<maze.goals.length; i++) {
    maze.maze[maze.goals[i].y][maze.goals[i].x].room = goals[i];
  }

  deadEnds = randomArray(deadEnds.slice(), maze.seed);
  for (var y=0; y<maze.size.height; y++) {
    for (var x=0; x<maze.size.width; x++) {
      if (!mazeIsDeadEnd(maze.maze[y][x].dir) || maze.maze[y][x].goal) {
        continue;
      }

      if (deadEnds.length) {
        maze.maze[y][x].room = deadEnds.pop();
      }
    }
  }
}

function mazeGenerate(width, height, complexity, goals, deadEnds, rooms) {
  var seed = randomSeed();

  return mazeGenerateFromSeed(seed, width, height, complexity, goals, deadEnds, rooms);
}

function mazeGenerateFromSeed(seed, width, height, complexity, goals, deadEnds, rooms) {
  var rnd = new RNG(seed);

  var context = {
    seed: seed,
    rnd: rnd,
    size: {
      width: width,
      height: height
    },
    unfollowedDeadEnds: {},
    goals: [],
    start: mazePosInRange(rnd, width >> 1, height >> 1, Math.floor(width / 3), Math.floor(height / 3)),
    maze: mazeCreateEmpty(width, height)
  }
  
  mazeAddDir(context, context.start, 15);
  for (var i=0; i<goals.length; i++) {
    mazePlaceGoal(context, goals[i], i);
  }

  mazeFollowDeadEnds(context);
  mazeFollowGoals(context);
  mazeFillEmptyRooms(context);
  mazeMinimizeDeadEnds(context, 4);
  mazeMinimizeStraightPaths(context, complexity);
  mazeInitRooms(context, goals, deadEnds, rooms);

  return context;
}