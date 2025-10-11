p5.disableFriendlyErrors = true; // Runs faster...
//"use strict";
/* Frequency Modulation (FM) Demo by Al Biles
   Simple FM with real-time controls to demonstrate
   how FM synthesis works.
   
   Carrier frequency controlled by a slider over the
   range 1 - 4000 Hz.
   
   Modulator controlled by pressing/holding mouse
   within the canvas. Horizontal location sets
   modulation frequency from 0 to 4000 Hz. Vertical
   location sets modulation amplitude from 0 - 4000 Hz.
   Amplitude interpreted in Hz because it is the
   maximum deviation of the carrier frequency.
   
   Displays continuous waveform and spectrum in real
   time, along with current values for the carrier
   frequency, modulator frequency and amplitude, and
   C to M ratio and modulation index.
 */
let carrier;   // Oscillator being modulated
let modulator; // Modulates amplitude of carrier
let fft;       // To visualize waveform, spectrum
let carSlide;  // Slider for carrier frequency
let carSlLab;  // Label for slider
let modFreq;   // Modulator frequency
let modAmp;    // Modulator Amplitude
let fScl;      // Frequency scale displayed below canvas
const nBins = 512; // Number of FFT bins & width
let playOn = false;

function setup() {
  createCanvas(nBins, 400);  // width == FFT bins
  background(0);
  
  // Frequency scale displayed just under the canvas
  fScl = createDiv();
  fScl.html("20");
  fScl.html(" 500", true);
  fScl.html(" 1100", true);
  fScl.html("   1800", true);
  fScl.html("   2500", true);
  fScl.html("   3200", true);
  fScl.html("    4000", true);
  fScl.html("       5000", true);
  fScl.html("       6000", true);
  fScl.html("       7000", true);
  fScl.html("       8000", true);
  fScl.html("       9000", true);
  fScl.html("      10000", true);
  fScl.html("      11000", true);
  fScl.style("color", "white");
  fScl.style("font-family", "Arial");
  fScl.style("font-size", "10px");
  
  // Set up carrier frequency slider & label
  carSlide = createSlider(20, 4000, 440, 1);
  carSlide.position(5, height+20);
  carSlLab = createDiv("Carrier Frequency");
  carSlLab.position(carSlide.position().x,
                    carSlide.position().y+20);
  carSlLab.style("color", "white");
  carSlLab.style("font-family", "Arial");
  carSlLab.style("font-size", "16px");

  // Carrier connects to master output by default
  carrier = new p5.Oscillator("sine");
  carrier.freq(440); // Initialize
  // carrier amp 0 => modulator controls it
  carrier.amp(0.08);
  //carrier.start();

  // Modulator: Use a sine for simplest spectrum
  modulator = new p5.Oscillator('sine');
  // Disconnect modulator from master output
  // Will connect to carrier's amplitude below
  modulator.freq(200); // Values changed by mouse
  modFreq = 200;
  modulator.amp(100);
  modAmp = 100;
  //modulator.start();
  modulator.disconnect();

  // Modulate carrier's frequency for FM
  carrier.freq(modulator);

  // Create fft to analyze the audio
  fft = new p5.FFT(0.0, nBins); // No smoothing
  
  oscPrompt();
}

// Display prompt for user action to start oscillators
function oscPrompt() {
  push();
  stroke(0);
  fill(255)
  textSize(18);
  text("Click here to start", 10, height - 25);
  pop();
}

function draw() {
  if (playOn) {
    background(0); // alpha

    // Reset carrier frequency from slider
    carrier.freq(carSlide.value());

    // Change modulator only if mouse pressed & on canvas
    if (mouseIsPressed && isOnCanv()) {
      // Map mouseY to modulator amp between 0 & 4000 Hz
      // Hz because it's the max dev to carrier freq
      modAmp = map(mouseY, 0, height, 4000, 0);
      modulator.amp(modAmp, 0.05); // Ramp to avoid clicks

      // Map mouseX to modulator freq between 1 & 4000 Hz
      modFreq = map(mouseX, 0, width, 1, 4000);
      modulator.freq(modFreq, 0.01); // Ramp: no artifacts
    }

    drawSpectrum();

    drawWaveform();

    drawText(carSlide.value(), modFreq, modAmp);
  }
}

function isOnCanv() {
  return mouseX >= 0 && mouseX <= width &&
         mouseY >= 0 && mouseY <= height;
}

function drawSpectrum() {
  // Analyze the spectrum
  let spectrum = fft.analyze();
  strokeWeight(2);
  stroke(255, 0, 255);
  // Draw the bins as adjacent verticle lines
  for (let i = 0; i< spectrum.length/2; i++) {
    let x = i*2;
    let y = map(spectrum[i], 0, 255, height, 0);
    // +2 gets rid of pink line at bottom for 0 values
    line(x, y+2, x, height+2);
  }
}

function drawWaveform() {
  // Analyze the waveform
  let waveform = fft.waveform();
  stroke(0, 255, 0);
  strokeWeight(3);
  // Draw it as an unfilled shape (more efficent)
  noFill();
  beginShape();
    for (let i = 0; i < waveform.length; i++) {
      let x = i;
      let y = map(waveform[i], -1, 1,
                  -height, height);
      //let y = map(waveform[i], -1, 1,
      //            -height / 2, height / 2);
      vertex(x, y + height / 2);
    }
  endShape();
}

// Draw updated legend in upper right corner
function drawText(carFreq, modFreq, modAmp) {
  noStroke();
  textFont("Arial");
  fill(255);
  text('Carrier Frequency: ' +
       carFreq.toFixed(0)+' Hz', width - 180, 17);
  text('Modulator Frequency: ' +
       modFreq.toFixed(1)+' Hz', width - 180, 34);
  text('Modulator Amplitude: ' +
       modAmp.toFixed(1), width - 180, 51);
  
  let c2M = carFreq / modFreq;
  let modInd = modAmp / modFreq;
  text('C / M: ' + c2M.toFixed(2) +
       '     Index: ' + modInd.toFixed(1),
       width - 180, 68);
}

function mousePressed() {
  // Only do this once after draw() starts
  if (! playOn) {
    carrier.start();
    modulator.start();
    
    push();         // Cover over oscillator prompt
    stroke(0);
    fill(0);
    rect(8, height-33, 200, 20);
    pop();
    
    playOn = true;  // Okay to play grains now
  }
}
