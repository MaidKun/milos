var MAX_SEED = 0x7FFF;

function randomSeed() {
  return Math.floor(Math.random() * (MAX_SEED - 1))
}

function RNG(seed) {
    this.m = 0x80000000;
    this.a = 1103515245;
    this.c = 12345;
  
    this.state = (seed !== undefined) ? seed : Math.floor(Math.random() * (this.m - 1));
  }
  RNG.prototype.nextInt = function() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }
  RNG.prototype.nextFloat = function() {
    return this.nextInt() / (this.m - 1);
  }
  RNG.prototype.nextRange = function(start, end) {
    var rangeSize = end - start;
    var randomUnder1 = this.nextInt() / this.m;
    return start + Math.floor(randomUnder1 * rangeSize);
  }
  RNG.prototype.choice = function(array) {
    return array[this.nextRange(0, array.length)];
  }
  
  function randomGenerateSeed(count, number) {
    var rng = new RNG(number);
    var list = [];
  
    for (var i=0; i<count; i++) {
      list.push(rng.nextFloat());
    }
  
    return list;
  }
  
  function randomShuffle(ar, seed) {
    var numbers = [];
    for( var a = 0, max = ar.length; a < max; a++){
      numbers.push(a);
    }
    var shuffled = [];
    for( var i = 0, len = ar.length; i < len; i++ ){
      var r = parseInt(seed[i] * (len - i));
      shuffled.push(ar[numbers[r]]);
      numbers.splice(r,1);
    }
    return shuffled;
  }
  
  function randomArray(array, seed) {
    return randomShuffle(array, randomGenerateSeed(array.length, seed));
  }
