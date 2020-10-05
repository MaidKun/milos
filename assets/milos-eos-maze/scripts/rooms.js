function generateRoomList(first, last, prefix) {
  var count = last - first + 1;
  var list = [];

  for (var i=0; i<count; i++) {
    list.push(prefix + (first + i));
  }

  return list;
}
