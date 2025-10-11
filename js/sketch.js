const numPartials = 4;
const osc = [];
const freqs = [];
const ampEnvs = [];
const fundamental = 55;
const shift = getRandomIntInclusive(1, 60);
const toneLength = "16";
const rate = getRandomIntInclusive(5, 30);

let cnv, slider, audioRunning, showText = true;

////////////////////////////////////////////////////////////////////////////////
// P5.js lifecycle                                                            //
////////////////////////////////////////////////////////////////////////////////
function setup() {
  noLoop();
  audioRunning = false;

  cnv = createCanvas(windowWidth, windowHeight);
  cnv.mousePressed(runExperience);

  frameRate(rate);
}

function draw() {
  colorMode(HSB);
  background(random(0, 255), 255, 255);
  if (showText) {
    textSize(width / 10);
    textAlign(CENTER, BOTTOM);
    text('Tap to play', windowWidth / 2, windowHeight / 2);
    textAlign(CENTER, TOP);
    textSize(width / 20);
    text('(turn up phone volume)', windowWidth / 2, windowHeight / 2);
  }
}

/* full screening will change the size of the canvas */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/* prevents the mobile browser from processing some default
 * touch events, like swiping left for "back" or scrolling the page.
 */
document.ontouchmove = function(event) {
  event.preventDefault();
};

////////////////////////////////////////////////////////////////////////////////
// Main                                                                       //
////////////////////////////////////////////////////////////////////////////////

async function runExperience() {
  console.log('runExperience at ' + rate + '...')
  showText = false;
  goFullScreen();

  await Tone.start()
  console.log('Tone.js audio is ready!')

  // start the P5 draw loop
  loop();

  if (!audioRunning) {
    calculateDSP();

    const loop = new Tone.Loop((time) => {
      console.log(time);
      for (i = 1; i <= numPartials; i++) {
        ampEnvs[i].attack = Math.random();
        ampEnvs[i].decay = Math.random();
        ampEnvs[i].release = Math.random();
        ampEnvs[i].triggerAttackRelease(toneLength);
      }

    }, toneLength).start(0);

    Tone.Transport.start();

    console.log(freqs);
    audioRunning = true;
  }
}

////////////////////////////////////////////////////////////////////////////////
// DSP                                                                        //
////////////////////////////////////////////////////////////////////////////////

function calculateDSP() {
  for (i = 1; i <= numPartials; i++) {

    ampEnvs[i] = new Tone.AmplitudeEnvelope({
      attack: Math.random(),
      decay: Math.random(),
      sustain: Math.random(),
      release: Math.random()
    });

    ampEnvs[i].toDestination();

    freqs[i] = ((i + shift) * fundamental)
      * Math.sqrt(
        Math.abs(
          1 + (i * i * 0.000521)
        )
      );

    osc[i] = new Tone.Oscillator(freqs[i], "sine").connect(ampEnvs[i]);
    osc[i].volume.value = -35;
    osc[i].start();
  }
}

////////////////////////////////////////////////////////////////////////////////
// Utils                                                                      //
////////////////////////////////////////////////////////////////////////////////

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function goFullScreen() {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.mozRequestFullScreen) { /* Firefox */
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE/Edge */
    elem.msRequestFullscreen();
  } else {
    console.log("Hmm, can't seem to requestFullscreen! What browser is this?")
  }
}