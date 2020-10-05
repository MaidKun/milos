function jsNum(num, type) {
  return num;
}

function jsGet(num, type) {
  switch (type) {
    case 'twice':
      return num * 2;

    default:
      return num;
  }
}

function jsSet(num, type) {
  return num;
}

function jsTextConst(text) {
  return text;
}

function libRange(from, to) {
  return (Math.random() * to - from) + from;
}

function libDuration(us) {
  return us * 1000;
}

function libIsInteger(txt) {
  return !!txt.toString().match(/^\d+$/);
}