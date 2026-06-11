/* Re - a tool to for NSMB lighting creation */

const nsmbVertexShader = `
  uniform vec3 baseColor;
  uniform vec3 ambientColor;
  uniform vec3 emissionColor;
  uniform vec3 specularColor;
  
  uniform vec3 lightDirs[4];
  uniform vec3 lightColors[4];
  uniform int numLights;

  varying vec2 vUv;
  varying vec3 vColor;

  void main() {
      vUv = uv;
      
      // Transform normal to view space
      vec3 N = normalize(normalMatrix * normal);
      
      // Fixed view vector in view space (camera looks down -Z)
      vec3 V = vec3(0.0, 0.0, -1.0); 

      // Initialize base sum with emission
      vec3 colorSum = emissionColor;

      for (int i = 0; i < 4; i++) {
          if (i >= numLights) break;

          // Light direction ray in view space
          vec3 L = normalize((viewMatrix * vec4(lightDirs[i], 0.0)).xyz);

          // 1. DiffuseCalc: max[0, -L(i) . N] x DiffuseColor x LightColor(i)
          float ld = max(0.0, dot(-L, N));
          ld = clamp(ld, 0.0, 1.0);
          vec3 D = (ld * lightColors[i]) * baseColor;

          // 2. AmbientCalc: AmbientColor x LightColor(i)
          vec3 A = lightColors[i] * ambientColor;

          // 3. SpecularCalc: Shininess(i) x SpecularColor x LightColor(i)
          // H = (L + V) / 2
          vec3 H = (L + V) / 2.0;
          float dotHN = dot(-H, N);
          
          // Formula: max[0, cos(2*theta)] -> cos(2*theta) = 2*cos^2(theta) - 1
          float ls = 2.0 * dotHN * dotHN - 1.0;
          ls = clamp(ls, 0.0, 1.0);
          
          vec3 S = (ls * lightColors[i]) * specularColor;

          // Sum calculations
          colorSum += D + A + S;
      }

      // Clamp VertexColor to 1.0 as per DS hardware spec
      vColor = min(vec3(1.0), colorSum);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nsmbFragmentShader = `
  uniform sampler2D map;
  uniform bool hasTexture;

  varying vec2 vUv;
  varying vec3 vColor;

  void main() {
      vec4 texColor = vec4(1.0);
      if (hasTexture) {
          texColor = texture2D(map, vUv);
          // DS basic alpha testing
          if(texColor.a < 0.1) discard; 
      }
      
      // In hardware, the sampled texture color is multiplied by the computed Vertex Color
      gl_FragColor = vec4(texColor.rgb * vColor, texColor.a);
  }
`;

function createNSMBMaterial(map = null, color = null) {
  const c = color ? color.clone() : new THREE.Color(1,1,1);
  return new THREE.ShaderMaterial({
    vertexShader: nsmbVertexShader,
    fragmentShader: nsmbFragmentShader,
    uniforms: {
      baseColor: { value: c },
      ambientColor: { value: new THREE.Color() },
      emissionColor: { value: new THREE.Color() },
      specularColor: { value: new THREE.Color(0.4, 0.4, 0.4) }, // Base hardware specular
      lightDirs: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
      lightColors: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] },
      numLights: { value: 0 },
      map: { value: map },
      hasTexture: { value: !!map }
    },
    transparent: false
  });
}

function convertToNSMBMaterial(originalMat) {
  if (originalMat.isShaderMaterial) return originalMat;
  const map = originalMat.map || null;
  const color = originalMat.color || App.engine.baseColor;
  const newMat = createNSMBMaterial(map, color);
  
  if (originalMat.transparent || (map && originalMat.opacity < 1)) {
    newMat.transparent = true;
  }
  return newMat;
}


const App = {
  engine: {
    scene: null,
    camera: null,
    renderer: null,
    material: null,
    previewMesh: null,
    width: window.innerWidth,
    height: window.innerHeight,
    modelType: "sphere",
    baseColor: null, // Holds THREE.Color for base diffuse
    autoRotate: false,
    customModels: {},
    isDragging: false,
    pointerPrevPosition: { x: 0, y: 0 }
  },

  lighting: {
    current: null,
    presetID: 0,
    presetCount: 0,
    contextTargetID: -1, 
    modalMode: "rename",  
    isCodeEditing: false 
  },

  ui: {
    colPickers: [],
    dirSliders: [],
    baseColPicker: null, 
    ambPicker: null,
    emiPicker: null,
    codeText: null,
    copyCodeBtn: null,
    addBtn: null,
    subBtn: null,
    menuContainer: null,
    profileButtonsContainer: null,
    profileButtons: [],
    saveBtn: null,
    modelSelect: null,
    rotateCheckbox: null,
    baseColPickerContainer: null, 
    diskLoadBtn: null,
    diskFileInput: null,
    contextMenu: null,
    modalOverlay: null,
    modalTitle: null,
    modalInput: null
  }
};

function round(value, decimals = 0) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

function createColor(r, g, b) {
  const color = new THREE.Color();
  if (typeof r === 'string') {
    color.set(r);
  } else if (g === undefined && b === undefined) {
    const v = (r || 0) / 31;
    color.setRGB(v, v, v);
  } else {
    color.setRGB((r || 0) / 31, (g || 0) / 31, (b || 0) / 31);
  }
  return color;
}

function createVector(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed"; 
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy strategy failed: ', err);
  }
  document.body.removeChild(textArea);
}

// --- Fluent DOM Component Wrapper ---
class P5DOMWrapper {
  constructor(element) {
    this.element = element;
    this.element.style.position = 'absolute';
    this.element.style.zIndex = '1000'; 
  }
  position(x, y) {
    this.element.style.left = x + 'px';
    this.element.style.top = y + 'px';
    return this;
  }
  style(prop, val) {
    this.element.style[prop] = val;
    return this;
  }
  mousePressed(callback) {
    this.element.onclick = callback;
    return this;
  }
  hide() {
    this.element.style.display = 'none';
    return this;
  }
  show() {
    this.element.style.display = 'block';
    return this;
  }
  parent(parentWrapper) {
    if (parentWrapper && parentWrapper.element) {
      parentWrapper.element.appendChild(this.element);
      this.element.style.position = 'relative';
      this.element.style.left = 'auto';
      this.element.style.top = 'auto';
    }
    return this;
  }
  remove() {
    this.element.remove();
  }
  value() {
    return this.element.value;
  }
}

function createColorPicker(initialColor) {
  const input = document.createElement('input');
  input.type = 'color';
  input.value = "#" + initialColor.getHexString();
  document.body.appendChild(input);
  const wrapper = new P5DOMWrapper(input);
  wrapper.color = () => new THREE.Color(input.value);
  return wrapper;
}

function createSlider(min, max, value, step) {
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  if (step !== undefined) input.step = step; 
  input.value = value;
  document.body.appendChild(input);
  const wrapper = new P5DOMWrapper(input);
  wrapper.value = () => parseFloat(input.value);
  return wrapper;
}

function createButton(text) {
  const btn = document.createElement('button');
  btn.textContent = text;
  document.body.appendChild(btn);
  return new P5DOMWrapper(btn);
}

function createSpan(text) {
  const span = document.createElement('span');
  span.textContent = text;
  document.body.appendChild(span);
  return new P5DOMWrapper(span);
}

function createDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return new P5DOMWrapper(div);
}

function createInput(placeholder) {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  document.body.appendChild(input);
  return new P5DOMWrapper(input);
}

function createTextArea(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  return new P5DOMWrapper(ta);
}

function createSelect(options) {
  const select = document.createElement('select');
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.text;
    select.appendChild(el);
  });
  document.body.appendChild(select);
  return new P5DOMWrapper(select);
}

function createCheckbox(labelText) {
  const label = document.createElement('label');
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.gap = '6px';
  label.style.color = '#ccc';
  label.style.fontSize = '12px';
  label.style.cursor = 'pointer';

  const input = document.createElement('input');
  input.type = 'checkbox';
  label.appendChild(input);
  label.appendChild(document.createTextNode(labelText));

  document.body.appendChild(label);
  const wrapper = new P5DOMWrapper(label);
  wrapper.checked = () => input.checked;
  return wrapper;
}

class DirLight {
  constructor(vec = createVector(), col = createColor(0)) {
    this.vec = vec;
    this.col = col;
  }
}

class StageLighting {
  constructor(dirLights = [new DirLight()], amb = null, emi = null) {
    this.dirLights = dirLights;
    this.amb = amb || createColor(0);
    this.emi = emi || createColor(0);
  }
  
  init() {}
  update() {}
  cleanup() {}
}

const purpleLighting = () => {
  const lights_ = [ new DirLight(createVector(22.5, 112.5, -22.5).divideScalar(180), createColor(31, 0, 31)) ];
  return new StageLighting(lights_, createColor(10,0,10), createColor(0,0,25));
}

const redLighting = () => {
  const lights_ = [ new DirLight(createVector(-0.75, 0.0625, -0.125), createColor(31, 28, 27)) ];
  return new StageLighting(lights_, createColor(20,6,5), createColor(20,5,5)); 
}

const normalLighting = () => {
  const lights_ = [ new DirLight(createVector(0, -0.125, -0.125), createColor(31)) ];
  return new StageLighting(lights_, createColor(6,6,6), createColor(10,9,8)); 
}

const sunsetLighting = () => {
  const lights_ = [ new DirLight(createVector(0.125, 0.875, -0.5), createColor(31)) ];
  return new StageLighting(lights_, createColor(15,6,6), createColor(19,16,0)); 
}

const newLighting = () => {
  const lights_ = [ new DirLight(createVector(90, 0, -180).divideScalar(180), createColor('#FF6100')),
                    new DirLight(createVector(-90, -90, -10).divideScalar(180), createColor('#570077')),
                    new DirLight(createVector(0, 90, -11.25).divideScalar(180), createColor('#2108BB')),
                    new DirLight(createVector(90, -33.75, 67.49).divideScalar(180), createColor('#01FF49'))];
  return new StageLighting(lights_, createColor('#000'), createColor('#000'));
}

const lightingProfiles = [
  { name: "Normal", build: () => normalLighting() },
  { name: "Sunset", build: () => sunsetLighting() },
  { name: "Purple", build: () => purpleLighting() },
  { name: "Heat Lamp", build: () => redLighting() },
  { name: "Freaky", build: () => newLighting() }
];

function getColorLevels31(threeColor) {
  return [
    Math.round(threeColor.r * 31),
    Math.round(threeColor.g * 31),
    Math.round(threeColor.b * 31)
  ];
}

// CPP formatting scheme
function getCPPCode() {
  let dv = App.lighting.current.dirLights.map(l=>createVector(l.vec.x*180, l.vec.y*180, l.vec.z*180));
  let dc = App.lighting.current.dirLights.map(l=>getColorLevels31(l.col));
  let a = getColorLevels31(App.lighting.current.amb);
  let e = getColorLevels31(App.lighting.current.emi);
  
  let codeStr = `{GX_RGB(31,31,31), ` +
                `GX_RGB(${a[0]},${a[1]},${a[2]}), ` +
                `GX_RGB(${e[0]},${e[1]},${e[2]})`;

  for (let i = 0; i < dv.length; i++) {
      codeStr += `,{{${round(dv[i].x,2)}deg,${round(dv[i].y,2)}deg,${round(dv[i].z,2)}deg}, ` + 
                 `GX_RGB(${dc[i][0]},${dc[i][1]},${dc[i][2]})}`;
  }
  return codeStr + "},";
}

function parseCPPCode(codeStr) {
  const rgbRegex = /GX_RGB\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  const rgbMatches = [];
  let match;
  while ((match = rgbRegex.exec(codeStr)) !== null) {
    rgbMatches.push([parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]);
  }

  const degRegex = /(-?[\d\.]+)\s*deg\s*,\s*(-?[\d\.]+)\s*deg\s*,\s*(-?[\d\.]+)\s*deg/g;
  const degMatches = [];
  while ((match = degRegex.exec(codeStr)) !== null) {
    degMatches.push([parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]);
  }

  if (rgbMatches.length < 3) return null;

  const amb = rgbMatches[1];
  const emi = rgbMatches[2];

  const lights = [];
  const dirLightCount = Math.min(degMatches.length, rgbMatches.length - 3);

  for (let i = 0; i < dirLightCount; i++) {
    lights.push({
      vec: degMatches[i],
      col: rgbMatches[3 + i]
    });
  }

  return {
    amb: amb,
    emi: emi,
    lights: lights
  };
}

function updatePreviewMesh() {
  if (App.engine.previewMesh) {
    App.engine.scene.remove(App.engine.previewMesh);
  }

  let mesh;
  const type = App.engine.modelType;

  if (type === "sphere") {
    const geometry = new THREE.SphereGeometry(200, 64, 64);
    mesh = new THREE.Mesh(geometry, App.engine.material);
    App.engine.previewMesh = mesh;
    App.engine.scene.add(App.engine.previewMesh);
  } else if (type === "torusknot") {
    const geometry = new THREE.TorusKnotGeometry(120, 40, 150, 16);
    mesh = new THREE.Mesh(geometry, App.engine.material);
    App.engine.previewMesh = mesh;
    App.engine.scene.add(App.engine.previewMesh);
  } else if (type === "box") {
    const geometry = new THREE.BoxGeometry(200, 200, 200);
    mesh = new THREE.Mesh(geometry, App.engine.material);
    App.engine.previewMesh = mesh;
    App.engine.scene.add(App.engine.previewMesh);
  } else if (type === "mario" || type === "squigga" || App.engine.customModels[type]) {
    if (typeof THREE.OBJLoader === 'undefined' || typeof THREE.MTLLoader === 'undefined' || typeof THREE.ColladaLoader === 'undefined') {
      if (!window.loadersPromise) {
        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        };

        window.loadersPromise = Promise.all([
          typeof THREE.MTLLoader === 'undefined' ? loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/MTLLoader.js') : Promise.resolve(),
          typeof THREE.OBJLoader === 'undefined' ? loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js') : Promise.resolve(),
          typeof THREE.ColladaLoader === 'undefined' ? loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/ColladaLoader.js') : Promise.resolve()
        ]);
      }

      window.loadersPromise.then(() => {
        updatePreviewMesh();
      }).catch(err => {
        console.error("Failed to load Three.js MTL/OBJ/DAE loaders", err);
      });
      return;
    }

    const isCustom = !!App.engine.customModels[type];
    
    let folderPath = type === "mario" ? 'assets/mario/' : 'assets/squigga/';
    let mtlFileName = type === "mario" ? 'mariomodel.mtl' : 'wakaba.mtl';
    let objFileName = type === "mario" ? 'mariomodel.obj' : 'wakaba.obj';
    let mtlLoader = new THREE.MTLLoader();
    let objLoader = new THREE.OBJLoader();

    if (isCustom) {
      const customData = App.engine.customModels[type];
      
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        const baseName = url.split('/').pop().split('\\').pop().toLowerCase();
        if (customData.filesMap[baseName]) {
          return customData.filesMap[baseName];
        }
        return url;
      });

      mtlLoader = new THREE.MTLLoader(manager);
      objLoader = new THREE.OBJLoader(manager);

      folderPath = "";
      mtlFileName = customData.mtlUrl;
      objFileName = customData.objUrl;
    }

    const fallbackToSphere = (err) => {
      console.warn(`Failed to load asset, falling back to sphere preview.`, err);
      const geometry = new THREE.SphereGeometry(200, 64, 64);
      mesh = new THREE.Mesh(geometry, App.engine.material);
      App.engine.previewMesh = mesh;
      App.engine.scene.add(App.engine.previewMesh);
    };

    const processObjAndAdd = (obj) => {
      obj.traverse((child) => {
        // Strip exported lights/cameras that might interfere
        if (child.isLight || child.isCamera) {
          child.visible = false;
        }
        if (child.isMesh) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(convertToNSMBMaterial);
          } else {
            child.material = convertToNSMBMaterial(child.material);
          }
        }
      });

      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      const scale = maxDim > 0 ? 380 / maxDim : 1;
      obj.scale.set(scale, scale, scale);

      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center.multiplyScalar(scale));

      App.engine.previewMesh = obj;
      App.engine.scene.add(App.engine.previewMesh);
    };

    if (isCustom) {
      const customData = App.engine.customModels[type];
      const loadCustomAsync = async () => {
        try {
          if (customData.isDae) {
            const colladaLoader = new THREE.ColladaLoader(mtlLoader.manager); // Reuse the manager for textures
            const daeText = await customData.daeFile.text();
            const collada = colladaLoader.parse(daeText, "");
            processObjAndAdd(collada.scene);
          } else {
            const objText = await customData.objFile.text();
            let materials = null;
            if (customData.mtlFile) {
              const mtlText = await customData.mtlFile.text();
              materials = mtlLoader.parse(mtlText, "");
              materials.preload();
              objLoader.setMaterials(materials);
            }
            const obj = objLoader.parse(objText);
            processObjAndAdd(obj);
          }
        } catch (e) {
          fallbackToSphere(e);
        }
      };
      loadCustomAsync();
    } else {
      if (mtlFileName) {
        mtlLoader.setPath(folderPath);
        mtlLoader.load(mtlFileName, (materials) => {
          materials.preload();
          objLoader.setMaterials(materials);
          objLoader.setPath(folderPath);
          objLoader.load(objFileName, processObjAndAdd, undefined, fallbackToSphere);
        }, undefined, (err) => {
          console.warn(`MTL file load failed, attempting to load OBJ without MTL.`, err);
          objLoader.setPath(folderPath);
          objLoader.load(objFileName, processObjAndAdd, undefined, fallbackToSphere);
        });
      } else {
        objLoader.setPath(folderPath);
        objLoader.load(objFileName, processObjAndAdd, undefined, fallbackToSphere);
      }
    }
  }
}

function updateActiveModelMaterials() {
  if (!App.engine.previewMesh) return;
  
  const currentLighting = App.lighting.current;
  const lDirs = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const lCols = [new THREE.Color(0), new THREE.Color(0), new THREE.Color(0), new THREE.Color(0)];
  const numLights = currentLighting ? currentLighting.dirLights.length : 0;
  
  if (currentLighting) {
    for(let i = 0; i < numLights; i++) {
      lDirs[i].copy(currentLighting.dirLights[i].vec);
      lCols[i].copy(currentLighting.dirLights[i].col);
    }
  }

  const emi = currentLighting ? currentLighting.emi : createColor(0);
  const amb = currentLighting ? currentLighting.amb : createColor(0);
  const baseColor = App.engine.baseColor;
  
  const customModel = App.engine.customModels[App.engine.modelType];
  const isTextured = (App.engine.modelType === "mario" || App.engine.modelType === "squigga" || customModel?.hasMtl || customModel?.isDae);

  App.engine.previewMesh.traverse((child) => {
    if (child.isMesh && child.material) {
      const mbuf = Array.isArray(child.material) ? child.material : [child.material];
      mbuf.forEach(mat => {
        if (mat.isShaderMaterial) {
          mat.uniforms.ambientColor.value.copy(amb);
          mat.uniforms.emissionColor.value.copy(emi);
          mat.uniforms.numLights.value = numLights;
          
          for(let i=0; i<4; i++) {
            mat.uniforms.lightDirs.value[i].copy(lDirs[i]);
            mat.uniforms.lightColors.value[i].copy(lCols[i]);
          }
          
          if (!isTextured || !mat.uniforms.hasTexture.value) {
            mat.uniforms.baseColor.value.copy(baseColor);
          } else {
            mat.uniforms.baseColor.value.setRGB(1, 1, 1);
          }
        }
      });
    }
  });
}

function handleDiskModelUpload(files) {
  const filesMap = {};
  let objFile = null;
  let mtlFile = null;
  let daeFile = null;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const name = f.name.toLowerCase();
    const url = URL.createObjectURL(f);
    filesMap[name] = url;
  }

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const name = f.name.toLowerCase();
    if (name.endsWith('.obj')) {
      objFile = f;
      const baseName = name.slice(0, -4);
      const possibleMtlName = baseName + ".mtl";
      for (let j = 0; j < files.length; j++) {
        if (files[j].name.toLowerCase() === possibleMtlName) {
          mtlFile = files[j];
          break;
        }
      }
      break;
    } else if (name.endsWith('.dae')) {
      daeFile = f;
      break;
    }
  }

  if (!objFile && !daeFile) {
    App.lighting.modalMode = "rename"; 
    App.ui.modalTitle.element.textContent = "Error Loading Files";
    App.ui.modalInput.element.value = "Missing .obj or .dae file in selection!";
    App.ui.modalOverlay.element.style.display = 'flex';
    return;
  }

  const activeModelFile = objFile || daeFile;
  const modelId = "custom_" + Date.now();
  const displayName = activeModelFile.name.replace(/\.[^/.]+$/, ""); 

  App.engine.customModels[modelId] = {
    name: displayName,
    objFile: objFile,
    mtlFile: mtlFile,
    daeFile: daeFile,
    isDae: !!daeFile,
    hasMtl: !!mtlFile,
    filesMap: filesMap
  };

  const opt = document.createElement('option');
  opt.value = modelId;
  opt.textContent = displayName + " (Disk)";
  App.ui.modelSelect.element.appendChild(opt);

  App.engine.modelType = modelId;
  App.ui.modelSelect.element.value = modelId;
  updatePreviewMesh();
}

function placeDOMElements() {
  let numLights = App.ui.dirSliders.length;
  let height = App.engine.height;
  let width = App.engine.width;

  App.ui.colPickers.forEach((picker,i) => picker.position(i*50, height - 120));
  App.ui.dirSliders.forEach((l,n) => l.forEach((s,i) => {
    s.position(0, height-(150+(numLights-1-n)*70+i*20));
    s.style('width', '80px');
  }));
  App.ui.ambPicker.position(0, height - 80);
  App.ui.emiPicker.position(0, height - 40);
  App.ui.codeText.position(5, 40);
  if (numLights == 4) {
    App.ui.addBtn.hide();
  } else {
    App.ui.addBtn.show().position(0, height - 225 - 70 * (numLights - 1));
  }
  if (numLights == 1) {
    App.ui.subBtn.hide();
  } else {
    App.ui.subBtn.show().position(numLights<4 ? 25 : 0, height - 225 - 70 * (numLights - 1));
  }
  App.ui.copyCodeBtn.position(5, 5);

  if (App.ui.menuContainer) {
    App.ui.menuContainer.position(width - 190, 10);
  }
}

function createDOMElements() {
  App.ui.colPickers = App.lighting.current.dirLights.map(l => createColorPicker(l.col));
  App.ui.dirSliders = App.lighting.current.dirLights.map(l => [createSlider(-1, 0.99996, l.vec.z, 0.00001),
                                                              createSlider(-1, 1, -l.vec.y, 0.00001), 
                                                              createSlider(-1, 0.99996, l.vec.x, 0.00001)]);
  
  App.ui.ambPicker = createColorPicker(App.lighting.current.amb);
  App.ui.emiPicker = createColorPicker(App.lighting.current.emi);
  
  App.ui.baseColPicker = createColorPicker(App.engine.baseColor)
    .style('width', '100%')
    .style('height', '26px')
    .style('border', '1px solid #444')
    .style('border-radius', '4px')
    .style('cursor', 'pointer')
    .style('box-sizing', 'border-box');
  
  if (App.ui.baseColPickerContainer) {
    App.ui.baseColPicker.parent(App.ui.baseColPickerContainer);
  }

  App.ui.codeText = createTextArea(getCPPCode())
    .style('color', '#fff')
    .style('font-family', 'monospace')
    .style('font-size', '13px')
    .style('background', 'rgba(15, 15, 15, 0.85)')
    .style('padding', '8px')
    .style('border', '1px solid #444')
    .style('border-radius', '4px')
    .style('white-space', 'pre-wrap')
    .style('width', '300px')
    .style('height', '80px')
    .style('resize', 'both')
    .style('outline', 'none');

  App.ui.codeText.element.addEventListener('focus', () => {
    App.lighting.isCodeEditing = true;
  });

  App.ui.codeText.element.addEventListener('blur', () => {
    App.lighting.isCodeEditing = false;
  });

  App.ui.codeText.element.addEventListener('input', (e) => {
    const parsed = parseCPPCode(e.target.value);
    if (parsed) {
      App.lighting.current.amb = createColor(parsed.amb[0], parsed.amb[1], parsed.amb[2]);
      App.lighting.current.emi = createColor(parsed.emi[0], parsed.emi[1], parsed.emi[2]);
      
      App.ui.ambPicker.element.value = "#" + App.lighting.current.amb.getHexString();
      App.ui.emiPicker.element.value = "#" + App.lighting.current.emi.getHexString();

      if (parsed.lights.length !== App.lighting.current.dirLights.length && parsed.lights.length >= 1 && parsed.lights.length <= 4) {
        deleteDOMElements();
        App.lighting.current.dirLights = parsed.lights.map(pl => new DirLight(
          createVector(pl.vec[0]/180, pl.vec[1]/180, pl.vec[2]/180),
          createColor(pl.col[0], pl.col[1], pl.col[2])
        ));
        App.lighting.current.init();
        createDOMElements();
        placeDOMElements();
        App.ui.codeText.element.focus();
      } else {
        parsed.lights.forEach((pl, i) => {
          const l = App.lighting.current.dirLights[i];
          if (l) {
            l.vec.set(pl.vec[0]/180, pl.vec[1]/180, pl.vec[2]/180);
            l.col = createColor(pl.col[0], pl.col[1], pl.col[2]);
            
            if (App.ui.dirSliders[i]) {
              App.ui.dirSliders[i][2].element.value = l.vec.x;
              App.ui.dirSliders[i][1].element.value = -l.vec.y;
              App.ui.dirSliders[i][0].element.value = l.vec.z;
            }
            if (App.ui.colPickers[i]) {
              App.ui.colPickers[i].element.value = "#" + l.col.getHexString();
            }
          }
        });
      }
    }
  });
    
  App.ui.copyCodeBtn = createButton("Copy Code");
  App.ui.addBtn = createButton("+").style('font-weight','bold');
  App.ui.subBtn = createButton("-").style('font-weight','bold');
  App.ui.addBtn.mousePressed(addLight);
  App.ui.subBtn.mousePressed(removeLight);
  App.ui.copyCodeBtn.mousePressed(() => copyToClipboard(App.ui.codeText.element.value));
}

function updateSidebarActiveState() {
  App.ui.profileButtons.forEach((btn, idx) => {
    if (idx === App.lighting.presetID) {
      btn.style('background', '#007acc')
         .style('color', '#fff')
         .style('border', '1px solid #0099ff')
         .style('font-weight', 'bold');
    } else {
      btn.style('background', '#222')
         .style('color', '#ccc')
         .style('border', '1px solid #444')
         .style('font-weight', 'normal');
    }
  });
}

function showContextMenu(e, idx) {
  e.preventDefault();
  App.lighting.contextTargetID = idx;
  
  const menu = App.ui.contextMenu.element;
  menu.style.display = 'flex';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';

  const deleteBtn = document.getElementById('ctx-delete');
  if (deleteBtn) {
    if (lightingProfiles.length <= 1) {
      deleteBtn.style.opacity = '0.4';
      deleteBtn.style.pointerEvents = 'none';
    } else {
      deleteBtn.style.opacity = '1';
      deleteBtn.style.pointerEvents = 'auto';
    }
  }
}

function hideContextMenu() {
  if (App.ui.contextMenu) {
    App.ui.contextMenu.element.style.display = 'none';
  }
}

function openRenameModal() {
  hideContextMenu();
  const idx = App.lighting.contextTargetID;
  if (idx < 0 || idx >= lightingProfiles.length) return;

  App.lighting.modalMode = "rename";
  App.ui.modalTitle.element.textContent = "Rename Profile";
  App.ui.modalInput.element.value = lightingProfiles[idx].name;
  App.ui.modalOverlay.element.style.display = 'flex';
  App.ui.modalInput.element.focus();
  App.ui.modalInput.element.select();
}

function openSaveModal() {
  App.lighting.modalMode = "save";
  App.ui.modalTitle.element.textContent = "Save Profile As";
  App.ui.modalInput.element.value = `Custom ${lightingProfiles.length + 1}`;
  App.ui.modalOverlay.element.style.display = 'flex';
  App.ui.modalInput.element.focus();
  App.ui.modalInput.element.select();
}

function closeRenameModal() {
  App.ui.modalOverlay.element.style.display = 'none';
}

function confirmModalAction() {
  if (App.lighting.modalMode === "rename") {
    confirmRename();
  } else if (App.lighting.modalMode === "save") {
    confirmSaveAs();
  }
}

function confirmRename() {
  const idx = App.lighting.contextTargetID;
  if (idx < 0 || idx >= lightingProfiles.length) return;

  const newName = App.ui.modalInput.element.value.trim();
  if (newName) {
    lightingProfiles[idx].name = newName;
    rebuildProfileButtons();
    updateSidebarActiveState();
  }
  closeRenameModal();
}

function confirmSaveAs() {
  const customName = App.ui.modalInput.element.value.trim() || `Custom ${lightingProfiles.length + 1}`;
  
  const savedDirLights = App.lighting.current.dirLights.map(l => new DirLight(l.vec.clone(), l.col.clone()));
  const savedAmb = App.lighting.current.amb.clone();
  const savedEmi = App.lighting.current.emi.clone();

  const newPreset = {
    name: customName,
    build: () => new StageLighting(
      savedDirLights.map(l => new DirLight(l.vec.clone(), l.col.clone())),
      savedAmb.clone(),
      savedEmi.clone()
    )
  };

  lightingProfiles.push(newPreset);
  App.lighting.presetCount = lightingProfiles.length;
  App.lighting.presetID = lightingProfiles.length - 1;

  resetLighting();
  closeRenameModal();
}

function deleteTargetProfile() {
  hideContextMenu();
  const idx = App.lighting.contextTargetID;
  if (idx < 0 || idx >= lightingProfiles.length || lightingProfiles.length <= 1) return;

  lightingProfiles.splice(idx, 1);
  App.lighting.presetCount = lightingProfiles.length;

  if (App.lighting.presetID === idx) {
    App.lighting.presetID = Math.max(0, idx - 1);
    resetLighting();
  } else {
    if (App.lighting.presetID > idx) {
      App.lighting.presetID--;
    }
    rebuildProfileButtons();
    updateSidebarActiveState();
  }
}

function rebuildProfileButtons() {
  App.ui.profileButtons.forEach(btn => btn.remove());
  App.ui.profileButtons = [];

  App.ui.profileButtons = lightingProfiles.map((p, idx) => {
    const btn = createButton(p.name)
      .style('color', '#ccc')
      .style('padding', '6px 10px')
      .style('text-align', 'left')
      .style('cursor', 'pointer')
      .style('border-radius', '4px')
      .style('transition', 'all 0.15s ease-in-out')
      .mousePressed(() => {
        App.lighting.presetID = idx;
        resetLighting();
      })
      .parent(App.ui.profileButtonsContainer);

    btn.element.addEventListener('contextmenu', (e) => showContextMenu(e, idx));
    return btn;
  });
}

function createSidebarPanel() {
  if (App.ui.menuContainer) return;

  App.ui.menuContainer = createDiv()
    .style('background', 'rgba(15, 15, 15, 0.9)')
    .style('border', '1px solid #444')
    .style('border-radius', '6px')
    .style('padding', '12px')
    .style('display', 'flex')
    .style('flex-direction', 'column')
    .style('gap', '8px')
    .style('width', '160px');

  createSpan("PROFILES")
    .style('color', '#888')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('letter-spacing', '1px')
    .style('margin-bottom', '4px')
    .style('display', 'block')
    .parent(App.ui.menuContainer);

  App.ui.profileButtonsContainer = createDiv()
    .style('display', 'flex')
    .style('flex-direction', 'column')
    .style('gap', '6px')
    .parent(App.ui.menuContainer);

  rebuildProfileButtons();

  createSpan("")
    .style('border-top', '1px solid #333')
    .style('margin', '6px 0')
    .parent(App.ui.menuContainer);

  createSpan("ACTIONS")
    .style('color', '#888')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('letter-spacing', '1px')
    .style('display', 'block')
    .parent(App.ui.menuContainer);

  App.ui.saveBtn = createButton("Save Profile As...")
    .style('background', '#007acc')
    .style('color', '#fff')
    .style('border', 'none')
    .style('font-weight', 'bold')
    .style('padding', '8px 10px')
    .style('cursor', 'pointer')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .mousePressed(openSaveModal)
    .parent(App.ui.menuContainer);

  createButton("Reset Current")
    .style('background', '#9e2a2b')
    .style('color', '#fff')
    .style('border', 'none')
    .style('font-weight', 'bold')
    .style('padding', '8px 10px')
    .style('cursor', 'pointer')
    .style('border-radius', '4px')
    .mousePressed(() => {
      resetLighting();
    })
    .parent(App.ui.menuContainer);

  createSpan("")
    .style('border-top', '1px solid #333')
    .style('margin', '6px 0')
    .parent(App.ui.menuContainer);

  createSpan("PREVIEW MODEL")
    .style('color', '#888')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('letter-spacing', '1px')
    .style('margin-top', '8px')
    .style('display', 'block')
    .parent(App.ui.menuContainer);

  App.ui.modelSelect = createSelect([
    { value: "sphere", text: "Sphere" },
    { value: "torusknot", text: "Torus Knot" },
    { value: "box", text: "Box" },
    { value: "mario", text: "Mario" },
    { value: "squigga", text: "Squigga" }
  ])
    .style('background', '#222')
    .style('color', '#fff')
    .style('border', '1px solid #444')
    .style('border-radius', '4px')
    .style('padding', '6px')
    .style('font-size', '11px')
    .style('outline', 'none')
    .style('cursor', 'pointer')
    .parent(App.ui.menuContainer);

  App.ui.modelSelect.element.addEventListener('change', (e) => {
    App.engine.modelType = e.target.value;
    updatePreviewMesh();
  });

  App.ui.diskLoadBtn = createButton("+ Load from Disk...")
    .style('background', '#2d3748')
    .style('color', '#e2e8f0')
    .style('border', '1px dashed #4a5568')
    .style('padding', '6px 10px')
    .style('font-size', '11px')
    .style('cursor', 'pointer')
    .style('border-radius', '4px')
    .style('text-align', 'center')
    .mousePressed(() => {
      App.ui.diskFileInput.element.click();
    })
    .parent(App.ui.menuContainer);

  const fileInputEl = document.createElement('input');
  fileInputEl.type = 'file';
  fileInputEl.multiple = true;
  fileInputEl.accept = '.obj,.mtl,.dae,.png,.jpg,.jpeg';
  fileInputEl.style.display = 'none';
  document.body.appendChild(fileInputEl);
  App.ui.diskFileInput = new P5DOMWrapper(fileInputEl);

  App.ui.diskFileInput.element.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleDiskModelUpload(e.target.files);
    }
  });

  App.ui.rotateCheckbox = createCheckbox("Auto-Rotate")
    .style('margin-top', '2px')
    .parent(App.ui.menuContainer);

  createSpan("MODEL BASE COLOR")
    .style('color', '#888')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('letter-spacing', '1px')
    .style('margin-top', '8px')
    .style('display', 'block')
    .parent(App.ui.menuContainer);

  App.ui.baseColPickerContainer = createDiv()
    .style('display', 'flex')
    .style('flex-direction', 'column')
    .style('margin-top', '4px')
    .parent(App.ui.menuContainer);

  updateSidebarActiveState();
}

function createCustomContextMenuAndModal() {
  // Context Menu Structure
  App.ui.contextMenu = createDiv()
    .style('display', 'none')
    .style('flex-direction', 'column')
    .style('background', '#181818')
    .style('border', '1px solid #444')
    .style('border-radius', '4px')
    .style('width', '110px')
    .style('box-shadow', '0 4px 12px rgba(0,0,0,0.5)')
    .style('padding', '4px 0')
    .style('position', 'absolute')
    .style('z-index', '10001');

  createButton("Rename")
    .style('background', 'none')
    .style('color', '#eee')
    .style('border', 'none')
    .style('padding', '8px 12px')
    .style('text-align', 'left')
    .style('cursor', 'pointer')
    .style('font-size', '12px')
    .style('width', '100%')
    .mousePressed(openRenameModal)
    .parent(App.ui.contextMenu);

  const deleteBtn = createButton("Delete")
    .style('background', 'none')
    .style('color', '#f87171')
    .style('border', 'none')
    .style('padding', '8px 12px')
    .style('text-align', 'left')
    .style('cursor', 'pointer')
    .style('font-size', '12px')
    .style('width', '100%')
    .mousePressed(deleteTargetProfile)
    .parent(App.ui.contextMenu);

  deleteBtn.element.id = 'ctx-delete';

  window.addEventListener('click', () => hideContextMenu());
  window.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('button') || !App.ui.profileButtons.some(btn => btn.element === e.target)) {
      hideContextMenu();
    }
  });

  App.ui.modalOverlay = createDiv()
    .style('display', 'none')
    .style('position', 'fixed')
    .style('top', '0')
    .style('left', '0')
    .style('width', '100%')
    .style('height', '100%')
    .style('background', 'rgba(0, 0, 0, 0.7)')
    .style('justify-content', 'center')
    .style('align-items', 'center')
    .style('z-index', '11000');

  const modalContent = createDiv()
    .style('background', '#1c1c1c')
    .style('border', '1px solid #444')
    .style('border-radius', '8px')
    .style('padding', '20px')
    .style('width', '240px')
    .style('display', 'flex')
    .style('flex-direction', 'column')
    .style('gap', '12px')
    .style('box-shadow', '0 10px 25px rgba(0,0,0,0.5)')
    .parent(App.ui.modalOverlay);

  App.ui.modalTitle = createSpan("Rename Profile")
    .style('color', '#bbb')
    .style('font-weight', 'bold')
    .style('font-size', '12px')
    .style('letter-spacing', '0.5px')
    .parent(modalContent);

  App.ui.modalInput = createInput("New Name...")
    .style('background', '#2d2d2d')
    .style('color', '#fff')
    .style('border', '1px solid #444')
    .style('border-radius', '4px')
    .style('padding', '8px')
    .style('font-size', '12px')
    .style('outline', 'none')
    .parent(modalContent);

  const btnRow = createDiv()
    .style('display', 'flex')
    .style('justify-content', 'flex-end')
    .style('gap', '8px')
    .style('margin-top', '4px')
    .parent(modalContent);

  createButton("Cancel")
    .style('background', '#3a3a3a')
    .style('color', '#ccc')
    .style('border', 'none')
    .style('border-radius', '4px')
    .style('padding', '6px 12px')
    .style('font-size', '11px')
    .style('cursor', 'pointer')
    .mousePressed(closeRenameModal)
    .parent(btnRow);

  createButton("Save")
    .style('background', '#007acc')
    .style('color', '#fff')
    .style('border', 'none')
    .style('border-radius', '4px')
    .style('padding', '6px 12px')
    .style('font-size', '11px')
    .style('font-weight', 'bold')
    .style('cursor', 'pointer')
    .style('confirm-action', '')
    .mousePressed(confirmModalAction)
    .parent(btnRow);

  App.ui.modalInput.element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmModalAction();
    if (e.key === 'Escape') closeRenameModal();
  });
}

function setupPointerOrbitControls() {
  const canvasEl = App.engine.renderer.domElement;

  const onPointerDown = (e) => {
    if (e.target !== canvasEl) return;
    App.engine.isDragging = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    App.engine.pointerPrevPosition = { x, y };
  };

  const onPointerMove = (e) => {
    if (!App.engine.isDragging || !App.engine.previewMesh) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = x - App.engine.pointerPrevPosition.x;
    const deltaY = y - App.engine.pointerPrevPosition.y;

    App.engine.previewMesh.rotation.y += deltaX * 0.008;
    App.engine.previewMesh.rotation.x += deltaY * 0.008;

    App.engine.pointerPrevPosition = { x, y };
  };

  const onPointerUp = () => {
    App.engine.isDragging = false;
  };

  canvasEl.addEventListener('mousedown', onPointerDown, false);
  window.addEventListener('mousemove', onPointerMove, false);
  window.addEventListener('mouseup', onPointerUp, false);

  canvasEl.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp, false);
}

function deleteDOMElements() {
  if (App.ui.ambPicker) App.ui.ambPicker.remove();
  if (App.ui.emiPicker) App.ui.emiPicker.remove();
  if (App.ui.baseColPicker) App.ui.baseColPicker.remove();
  if (App.ui.colPickers) App.ui.colPickers.forEach(picker => picker.remove());
  if (App.ui.dirSliders) App.ui.dirSliders.forEach(vec => vec.forEach(s=>s.remove()));
  if (App.ui.codeText) App.ui.codeText.remove();
  if (App.ui.addBtn) App.ui.addBtn.remove();
  if (App.ui.subBtn) App.ui.subBtn.remove();
  if (App.ui.copyCodeBtn) App.ui.copyCodeBtn.remove();
}

function resetLighting() {
  if (App.lighting.current) App.lighting.current.cleanup();
  deleteDOMElements();
  App.lighting.current = lightingProfiles[App.lighting.presetID].build();
  App.lighting.current.init();
  createDOMElements();
  placeDOMElements();
  rebuildProfileButtons();
  updateSidebarActiveState();
}

function addLight() {
  if (App.lighting.current.dirLights.length < 4) {
    deleteDOMElements();
    App.lighting.current.dirLights.push(new DirLight(createVector(0,0,0), createColor(0)));
    App.lighting.current.init();
    createDOMElements();
    placeDOMElements();
  }
}

function removeLight() {
  if (App.lighting.current.dirLights.length > 0) {
    App.lighting.current.dirLights.pop();
    deleteDOMElements();
    App.lighting.current.init();
    createDOMElements();
    placeDOMElements();
  }
}

function setup() {
  App.engine.scene = new THREE.Scene();

  const aspect = App.engine.width / App.engine.height;
  const d = 300;
  App.engine.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
  App.engine.camera.position.set(0, 0, 300);
  App.engine.camera.lookAt(0, 0, 0);

  App.engine.renderer = new THREE.WebGLRenderer({ antialias: true });
  App.engine.renderer.setSize(App.engine.width, App.engine.height);
  document.body.appendChild(App.engine.renderer.domElement);

  App.engine.baseColor = createColor(31, 31, 31);
  App.engine.material = createNSMBMaterial(null, App.engine.baseColor);
  
  updatePreviewMesh();

  App.lighting.presetID = 0;
  App.lighting.presetCount = lightingProfiles.length;
  App.lighting.current = lightingProfiles[App.lighting.presetID].build();
  App.lighting.current.init();
  
  createSidebarPanel();
  createDOMElements();
  createCustomContextMenuAndModal();
  setupPointerOrbitControls();
  placeDOMElements();

  window.addEventListener('resize', windowResized, false);
}

function draw() {
  if (!App.lighting.isCodeEditing) {
    App.engine.baseColor = App.ui.baseColPicker.color();

    App.lighting.current.dirLights.forEach((l, i) => {
      l.vec = createVector(App.ui.dirSliders[i][2].value(),
                                -App.ui.dirSliders[i][1].value(), 
                                App.ui.dirSliders[i][0].value());
      l.col = App.ui.colPickers[i].color();
    });
    
    App.lighting.current.amb = App.ui.ambPicker.color();
    App.lighting.current.emi = App.ui.emiPicker.color();
  }
  
  updateActiveModelMaterials();
  App.lighting.current.update();
  
  if (App.ui.codeText && App.ui.codeText.element && !App.lighting.isCodeEditing) {
    App.ui.codeText.element.value = getCPPCode();
  }

  if (App.ui.rotateCheckbox && App.ui.rotateCheckbox.checked() && App.engine.previewMesh && !App.engine.isDragging) {
    App.engine.previewMesh.rotation.y += 0.01;
  }

  App.engine.renderer.render(App.engine.scene, App.engine.camera);
}

function animate() {
  requestAnimationFrame(animate);
  draw();
}

function windowResized() {
  App.engine.width = window.innerWidth;
  App.engine.height = window.innerHeight;
  
  const aspect = App.engine.width / App.engine.height;
  const d = 300;
  App.engine.camera.left = -d * aspect;
  App.engine.camera.right = d * aspect;
  App.engine.camera.top = d;
  App.engine.camera.bottom = -d;
  App.engine.camera.updateProjectionMatrix();
  
  App.engine.renderer.setSize(App.engine.width, App.engine.height);
  placeDOMElements();
}

window.onload = () => {
  setup();
  animate();
};
