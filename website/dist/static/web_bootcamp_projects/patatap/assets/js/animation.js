

var keyData = {
  q: {
  sound: new Howl({
    src: ['assets/media/bubbles.mp3']
  }),
  color: '#1abc9c'
  },
  w: {
  sound: new Howl({
    src: ['assets/media/clay.mp3']
  }),
  color: '#2ecc71'
  },
  e: {
  sound: new Howl({
    src: ['assets/media/confetti.mp3']
  }),
  color: '#3498db'
  },
  r: {
  sound: new Howl({
    src: ['assets/media/corona.mp3']
  }),
  color: '#9b59b6'
  },
  t: {
  sound: new Howl({
    src: ['assets/media/dotted-spiral.mp3']
  }),
  color: '#34495e'
  },
  y: {
  sound: new Howl({
    src: ['assets/media/flash-1.mp3']
  }),
  color: '#16a085'
  },
  u: {
  sound: new Howl({
    src: ['assets/media/flash-2.mp3']
  }),
  color: '#27ae60'
  },
  i: {
  sound: new Howl({
    src: ['assets/media/flash-3.mp3']
  }),
  color: '#2980b9'
  },
  o: {
  sound: new Howl({
  src: ['assets/media/glimmer.mp3']
  }),
  color: '#8e44ad'
  },
  p: {
  sound: new Howl({
    src: ['assets/media/moon.mp3']
  }),
  color: '#2c3e50'
  },
  a: {
  sound: new Howl({
    src: ['assets/media/pinwheel.mp3']
  }),
  color: '#f1c40f'
  },
  s: {
  sound: new Howl({
    src: ['assets/media/piston-1.mp3']
  }),
  color: '#e67e22'
  },
  d: {
  sound: new Howl({
    src: ['assets/media/piston-2.mp3']
  }),
  color: '#e74c3c'
  },
  f: {
  sound: new Howl({
    src: ['assets/media/prism-1.mp3']
  }),
  color: '#95a5a6'
  },
  g: {
  sound: new Howl({
    src: ['assets/media/prism-2.mp3']
  }),
  color: '#f39c12'
  },
  h: {
  sound: new Howl({
    src: ['assets/media/prism-3.mp3']
  }),
  color: '#d35400'
  },
  j: {
  sound: new Howl({
    src: ['assets/media/splits.mp3']
  }),
  color: '#1abc9c'
  },
  k: {
  sound: new Howl({
    src: ['assets/media/squiggle.mp3']
  }),
  color: '#2ecc71'
  },
  l: {
  sound: new Howl({
    src: ['assets/media/strike.mp3']
  }),
  color: '#3498db'
  },
  z: {
  sound: new Howl({
    src: ['assets/media/suspension.mp3']
  }),
  color: '#9b59b6'
  },
  x: {
  sound: new Howl({
    src: ['assets/media/timer.mp3']
  }),
  color: '#34495e'
  },
  c: {
  sound: new Howl({
    src: ['assets/media/ufo.mp3']
  }),
  color: '#16a085'
  },
  v: {
  sound: new Howl({
    src: ['assets/media/veil.mp3']
  }),
  color: '#27ae60'
  },
  b: {
  sound: new Howl({
    src: ['assets/media/wipe.mp3']
  }),
  color: '#2980b9'
  },
  n: {
  sound: new Howl({
  src: ['assets/media/zig-zag.mp3']
  }),
  color: '#8e44ad'
  },
  m: {
  sound: new Howl({
    src: ['assets/media/moon.mp3']
  }),
  color: '#2c3e50'
  }
  }





var circles = new Array();

function onKeyDown(event) {
  if (keyData[event.key]){
    keyData[event.key].sound.play();

    var path = new Path.Circle({
      center: Point.random() * view.size,
      radius: view.size.width * 0.33,
      fillColor: Color.random(),
    });
  
    circles.push(path);
  }
}

function onFrame(event) {
  for (var i = circles.length - 1; i >= 0; i --){
    circles[i].fillColor.hue += 2;
    circles[i].scale(0.93);
    if (circles[i].area <= 10){
      circles[i].remove();
      circles.splice(i, 1);
    }
  }
}