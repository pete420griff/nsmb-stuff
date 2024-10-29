
/* Re - a tool to for NSMB lighting creation */

class DirLight {
  constructor(vec=createVector(),col=color(0)) {
    vec.y *= -1;
    this.vec = vec;
    this.col = col;
  }
}

class StageLighting {
  constructor(dirLights=[new DirLight()],amb=null,emi=null) {
    this.dirLights = dirLights;
    this.amb = amb;
    this.emi = emi;
  }
  set(setMat = true) {
    this.dirLights.forEach(l => directionalLight(l.col, l.vec));
    if (setMat) {
      ambientLight(this.amb);
      emissiveMaterial(this.emi);
    }
  }
}

const purpleLighting = () => {
  const lights_ = [ new DirLight(createVector(22.5,112.5,-22.5).div(180), color(31, 0, 31)) ];
  return new StageLighting(lights_, 
                            color(10,0,10),   // mat ambient
                            color(0,0,25));   // mat emission
}

const redLighting = () => {
  const lights_ = [ new DirLight(createVector(-0.75, 0.0625, -0.125), color(31, 28, 27)) ];
  return new StageLighting(lights_, 
                            color(20,6,5),
                            color(20,5,5)); 
}

const normalLighting = () => {
  const lights_ = [ new DirLight(createVector(0, -0.125, -0.125), color(31)) ];
  return new StageLighting(lights_, 
                            color(6,6,6),
                            color(10,9,8)); 
}

const jungleLighting = () => {
  const lights_ = [ new DirLight(createVector(-0.125, -0.734375, -0.375), color(31)) ];
  return new StageLighting(lights_, 
                            color(6,6,6),
                            color(10,9,8)); 
}

const sunsetLighting = () => {
  const lights_ = [ new DirLight(createVector(0.125, 0.875, -0.5), color(31)) ];
  return new StageLighting(lights_, 
                            color(15,6,6),
                            color(19,16,0)); 
}

const newLighting = () => {
  const lights_ = [ new DirLight(createVector(90, 0, -180).div(180), color('#FF6100')),
                    new DirLight(createVector(-90, -90, -10).div(180), color('#570077')),
                    new DirLight(createVector(0, 90, -11.25).div(180), color('#2108BB')),
                    new DirLight(createVector(90,-33.75, 67.49).div(180), color('#01FF49'))];
  
  return new StageLighting(lights_, 
                            color('#000'),
                            color('#000'));
}

const lightingProfiles = [()=>normalLighting(),()=>jungleLighting(),
                          ()=>sunsetLighting(),()=>purpleLighting(),
                          ()=>redLighting(),()=>newLighting()]

function getCPPCode() {
  let dv = myLighting.dirLights.map(l=>createVector(l.vec.x*180,l.vec.y*180,l.vec.z*180));
  let dc = myLighting.dirLights.map(l=>l.col.levels.map(c => round(c*(31/255))));
  let a = myLighting.amb.levels.map(c => round(c*(31/255)));
  let e = myLighting.emi.levels.map(c => round(c*(31/255)));
  let codeStr = `{GX_RGB(31,31,31), ` +
                `GX_RGB(${a[0]},${a[1]},${a[2]}), ` +
                `GX_RGB(${e[0]},${e[1]},${e[2]})`;

  for (let i=0; i<dv.length;i++) {
      codeStr += `,{{${round(dv[i].x,2)}deg,${round(dv[i].y*-1,2)}deg,${round(dv[i].z,2)}deg}, ` + 
                `GX_RGB(${dc[i][0]},${dc[i][1]},${dc[i][2]})}`;
  }
  
  return codeStr + "},";
}

function placeDOMElements() {
  let numLights = dirSliders.length;
  colPickers.forEach((picker,i) => picker.position(i*50, height - 120));
  dirSliders.forEach((l,n) => l.forEach((s,i) => {s.position(0,height-(150+(numLights-1-n)*70+i*20)),
                                                 s.style('width', '80px')}));
  ambPicker.position(0, height - 80);
  emiPicker.position(0, height - 40);
  nextBtn.position(width / 2, height - 40);
  prevBtn.position(width / 2 - 55, height - 40);
  codeText.position(5,40);
  if (numLights == 4) {
    addBtn.hide();
  } else {
    addBtn.position(0, height - 225 - 70 * (numLights - 1));
  }
  if (numLights == 1) {
    subBtn.hide();
  } else {
    subBtn.position(numLights<4 ? 25 : 0, height - 225 - 70 * (numLights - 1));
  }
  copyCodeBtn.position(5,5);
  if (!bitched) {bitchBtn.position(width-80,5);
  } else {
    bitchBtn.hide();
  }
}

function createDOMElements() {
  codeUI = createDiv();
  colPickers = myLighting.dirLights.map(l => createColorPicker(l.col));
  dirSliders = myLighting.dirLights.map(l => [createSlider(-1,0.99996,l.vec.z,0.00001),
                                             createSlider(-1,0.99996,l.vec.y,0.00001),
                                             createSlider(-1,0.99996,l.vec.x,0.00001)]);
  
  ambPicker = createColorPicker(myLighting.amb);
  emiPicker = createColorPicker(myLighting.emi);
  nextBtn = createButton("Next");
  prevBtn = createButton("Prev");
  nextBtn.mousePressed(()=>{if (presetID<numPresets-1) presetID++; resetLighting()});
  prevBtn.mousePressed(()=>{if (presetID>0) presetID--; resetLighting()});
  codeText = createSpan(getCPPCode()).style('color','white').id('code');
  copyCodeBtn = createButton("Copy Code");
  codeText.parent(codeUI);
  addBtn = createButton("+").style('font-weight','bold');
  subBtn = createButton("-").style('font-weight','bold');
  addBtn.mousePressed(addLight);
  subBtn.mousePressed(removeLight);
  bitchBtn = createButton("Better UI");
  bitchBtn.mousePressed(()=>{alert("fuck off"); bitched=true; bitchBtn.hide();});
  copyCodeBtn.mousePressed(()=>navigator.clipboard.writeText(getCPPCode()));
}

function deleteDOMElements() {
  ambPicker.remove();
  emiPicker.remove();
  nextBtn.remove();
  prevBtn.remove();
  colPickers.forEach(picker => picker.remove());
  dirSliders.forEach((vec,i) => vec.forEach(s=>s.remove()));
  codeText.remove();
  addBtn.remove();
  subBtn.remove();
  copyCodeBtn.remove();
  bitchBtn.remove();
}

function resetLighting() {
  deleteDOMElements();
  myLighting = lightingProfiles[presetID]();
  createDOMElements();
  placeDOMElements();
}

function addLight() {
  if (myLighting.dirLights.length < 4) {
    deleteDOMElements();
    myLighting.dirLights.push(new DirLight(createVector(0,0,0),color(0)));
    createDOMElements();
    placeDOMElements();
  }
}

function removeLight() {
  if (myLighting.dirLights.length > 0) {
    myLighting.dirLights.pop();
    deleteDOMElements();
    createDOMElements();
    placeDOMElements();
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  camera(0,0,300);
  colorMode(RGB, 31); // Keeps RGB values between 0-31
  
  presetID = 0;
  numPresets = lightingProfiles.length;
  
  myLighting = lightingProfiles[presetID]();
  
  bitched = false;
  
  createDOMElements();
  placeDOMElements();
  
}

function draw() {
  background(0);
  noStroke();
  ortho();
  
  myLighting.dirLights.forEach((l,i) => {l.vec = createVector(dirSliders[i][2].value(),
                                                              dirSliders[i][1].value(),
                                                              dirSliders[i][0].value())});
  
  myLighting.dirLights.forEach((l,i) => {l.col = colPickers[i].color()});
  myLighting.amb = ambPicker.color();
  myLighting.emi = emiPicker.color();
  myLighting.set();
  let span = document.getElementById("code");
  span.textContent = getCPPCode();
  
  sphere(200);
  
}

function windowResized() {
  resizeCanvas(windowWidth,windowHeight);
  placeDOMElements();
}
