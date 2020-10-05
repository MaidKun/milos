function streamFromText(text) {
  var stream=[];
  
  for (var i=0; i<text.length; i++) {
    var index = STREAM_LETTERS.indexOf(text[i]);
    if (index == -1) {
      continue;
    }

    stream.push((index & 1) ? 1 : 0);
    stream.push((index & 2) ? 1 : 0);
    stream.push((index & 4) ? 1 : 0);
    stream.push((index & 8) ? 1 : 0);
    stream.push((index & 16) ? 1 : 0);
  }

  return stream;
}

function streamToText(stream) {
  var text = '';
  for (var i=0; i<stream.length; i+=5) {
    var index = (
      (stream[i+0] ? 1 : 0) |
      (stream[i+1] ? 2 : 0) |
      (stream[i+2] ? 4 : 0) |
      (stream[i+3] ? 8 : 0) |
      (stream[i+4] ? 16 : 0) 
    )
    text += STREAM_LETTERS[index];
  }
  return text;
}

function gameCodeAddNumber(stream, number, maxValue) {
  while (maxValue) {
    stream.push(number & 1);
    number >>= 1;
    maxValue >>= 1;
  }
}

function gameCodeReadNumber(stream, maxValue) {
  var number = 0;
  var shift = 0;
  while (maxValue) {
    number |= (stream.stream[stream.index++] << shift)
    shift++;
    maxValue >>= 1;
  }
  return number;
}

function gameCodeGenerate(maze, withGameState) {
  var stream = [];

  gameCodeAddNumber(stream, MAZE_VERSION, 7);
  gameStoreMazeState(stream, MAZE_VERSION);
  gameCodeAddNumber(stream, maze ? 1 : 0, 1);

  if (maze) {
    if (isLotteryMode) {
      return '<not available in lottery mode>';
    }
  
    gameCodeAddNumber(stream, maze.size.width, 15);
    gameCodeAddNumber(stream, maze.size.height, 15);
    gameCodeAddNumber(stream, maze.seed, MAX_SEED);
    gameCodeAddNumber(stream, withGameState ? 1 : 0 , 1);
    if (withGameState) {
      gameStoreGameState(stream);
      gameStoreState(stream);
    }
  }

  return gameCodeAddChecksum(streamToText(stream));
}

function gameCodeAddChecksum(text) {
  return gameCodeGetChecksum(text) + text;
}

function gameCodeGetChecksum(text) {
  var code = 0;
  for (var i=0; i<text.length; i++) {
    code += STREAM_LETTERS.indexOf(text[0]) * GAME_CODE_CHECKSUM[i % GAME_CODE_CHECKSUM.length];
  }
  return STREAM_LETTERS[code % STREAM_LETTERS.length];
}

function gameCodeAddMazeMap(stream, maze) {
  for (var y=0; y<maze.size.height; y++) {
    for (var x=0; x<maze.size.width; x++) {
      stream.push((maze.maze[y][x].dir & MAZE_DIR_RIGHT) ? 1 : 0);
      stream.push((maze.maze[y][x].dir & MAZE_DIR_DOWN) ? 1 : 0);
    }
  }
}

function gameCodeRestore(fullCode) {
  var checkLetter = fullCode[0];
  var code = fullCode.substr(1);
  if (checkLetter !== gameCodeGetChecksum(code)) {
    return false;
  }

  var stream = streamFromText(code);
  var context = {stream: stream, index: 0};
  var version = gameCodeReadNumber(context, 7);
  if (version > MAZE_VERSION) {
    return false;
  }

  gameRestoreMazeState(context, version);

  var hasMaze = gameCodeReadNumber(context, 1);
  var maze = null;
  if (hasMaze) {
    goals = mazeValidRooms(mazeGoals(version));
    deadEnds = mazeValidRooms(mazeDeadEnds(version));
    rooms = mazeValidRooms(mazeRooms(version));

    var width = gameCodeReadNumber(context, 15);
    var height = gameCodeReadNumber(context, 15);
    var seed = gameCodeReadNumber(context, MAX_SEED);
    maze = mazeGenerateFromSeed(seed, width, height, 0.5, goals, deadEnds, rooms);

    var withGameState = gameCodeReadNumber(context, 1);
    if (withGameState) {
      gameRestoreGameState(context, version);
      gameRestoreState(maze, context, version);
    } else {
      gameReset();
    }
  }

  return maze;
}

function gameCodeReadMazeMap(context, width, height) {
  var maze = {
    size: {width: width, height: height},
    start: {},
    unfollowedDeadEnds: {},
    maze: mazeCreateEmpty(width, height)
  }

  for (var y=0; y<height; y++) {
    for (var x=0; x<width; x++) {
      var dir = context.stream[context.index++] ? MAZE_DIR_RIGHT : 0;
      dir |= context.stream[context.index++] ? MAZE_DIR_DOWN : 0;
      mazeAddDir(maze, {x: x, y: y}, dir);
    }
  }

  return maze;
}