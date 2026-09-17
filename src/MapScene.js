import * as THREE from 'three';
import {geographicLayers, project} from './data/layers';
import {regions} from './data/regions';

const toWorld = (coordinate, height = .4) => {
  const [x, y] = project(coordinate);
  return new THREE.Vector3(x, height, -y);
};
const inside = (point, ring) => {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0]-a[0]) * (point[1]-a[1]) / (b[1]-a[1]) + a[0]) result = !result;
  }
  return result;
};
function shapeFor(polygon) {
  const shape = new THREE.Shape(polygon[0].map(c => new THREE.Vector2(...project(c))));
  for (const hole of polygon.slice(1)) shape.holes.push(new THREE.Path(hole.map(c => new THREE.Vector2(...project(c)))));
  return shape;
}
function material(color, extra = {}) { return new THREE.MeshStandardMaterial({color, roughness: .92, metalness: .03, ...extra}); }

export function createMapScene({canvas, features, labels, onHover, onSelect, onFailure}) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  const group = new THREE.Group();
  scene.add(group);
  scene.add(new THREE.HemisphereLight('#ffe1b1', '#4d321f', 2.4));
  const light = new THREE.DirectionalLight('#ffcf93', 4.5);
  light.position.set(-8, 18, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, {left: -12, right: 12, top: 12, bottom: -12});
  light.shadow.bias = -.002;
  scene.add(light);
  const fill = new THREE.DirectionalLight('#e4c8a0', 1.3);
  fill.position.set(8, 6, -10); scene.add(fill);

  // A textured cartographic surface, generated locally, not a photograph of a map.
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = 256;
  const context = textureCanvas.getContext('2d');
  const pixels = context.createImageData(256, 256);
  let seed = 127;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = (seed / 4294967295) * 30;
    pixels.data.set([205+n, 177+n, 132+n, 255], i);
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(.7, .7);
  texture.colorSpace = THREE.SRGBColorSpace;
  const meshes = [], selectable = [], borders = {};
  const baseColor = '#b88b52', activeColor = '#d7ac72';
  for (const feature of features) {
    for (const polygon of feature.polygons) {
      const geometry = new THREE.ExtrudeGeometry(shapeFor(polygon), {depth: .42, bevelEnabled: false, steps: 1, curveSegments: 1});
      geometry.rotateX(-Math.PI / 2);
      const top = material(feature.id ? activeColor : baseColor, {map: texture});
      const mesh = new THREE.Mesh(geometry, [top, material('#705034')]);
      mesh.userData.region = feature.id;
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh); meshes.push(mesh);
      if (feature.id) selectable.push(mesh);
      const points = polygon[0].map(c => toWorld(c, .435));
      const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({color: feature.id ? '#f8d8a0' : '#bb915c', transparent: true, opacity: feature.id ? .65 : .14}));
      group.add(border);
      if (feature.id) (borders[feature.id] ??= []).push(border);
    }
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(27, 23), new THREE.ShadowMaterial({opacity: .34}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -.04; ground.receiveShadow = true; scene.add(ground);

  // Restricted western ridge mesh. Heights are stylized, never presented as measured elevation.
  const mountainGroup = new THREE.Group();
  const ridge = geographicLayers.mountains.paths[0];
  for (let n = 0; n < ridge.length - 1; n++) {
    const start = ridge[n], end = ridge[n+1];
    for (let j = 0; j < 7; j++) {
      const t = j / 7;
      const lon = start[0] + (end[0]-start[0])*t, lat = start[1] + (end[1]-start[1])*t;
      if (!features.some(f => f.polygons.some(p => inside([lon,lat],p[0])))) continue;
      const h = .16 + (.5 + Math.sin(n*7+j)*.5) * .32;
      const geometry = new THREE.ConeGeometry(.22 + h*.3, h, 5, 1);
      const mountain = new THREE.Mesh(geometry, material('#9c754d', {flatShading: true}));
      mountain.position.copy(toWorld([lon,lat], .42+h/2));
      mountain.scale.z = 1.4; mountain.rotation.y = n+j; mountain.castShadow = true;
      mountainGroup.add(mountain);
    }
  }
  group.add(mountainGroup);

  const layerGroups = {};
  for (const [key, spec] of Object.entries(geographicLayers)) {
    const layer = new THREE.Group(); layer.visible = false;
    const layerMaterial = material(spec.color, {emissive: spec.color, emissiveIntensity: .15});
    if (key === 'mountains') {
      for (const child of mountainGroup.children) {
        const mountain = new THREE.Mesh(child.geometry, layerMaterial);
        mountain.position.copy(child.position); mountain.rotation.copy(child.rotation);
        mountain.scale.copy(child.scale).multiplyScalar(1.35); layer.add(mountain);
      }
    }
    for (const path of key === 'coasts' ? spec.paths : []) {
      const curve = new THREE.CatmullRomCurve3(path.map(c => toWorld(c, .49)));
      layer.add(new THREE.Mesh(new THREE.TubeGeometry(curve, path.length*7, .065, 5, false), layerMaterial));
    }
    for (const coordinate of spec.points || []) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(key==='oases' ? .37 : .18, .055, 5, 28), layerMaterial);
      ring.rotation.x = -Math.PI/2; ring.position.copy(toWorld(coordinate, .52)); layer.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(key==='oases' ? .29 : .1, 28), material(spec.color, {transparent:true,opacity:.65}));
      disc.rotation.x = -Math.PI/2; disc.position.copy(toWorld(coordinate, .51)); layer.add(disc);
    }
    for (const area of spec.areas || []) {
      const geometry = new THREE.ShapeGeometry(shapeFor([area])); geometry.rotateX(-Math.PI/2);
      const patch = new THREE.Mesh(geometry, material(spec.color, {transparent:true,opacity:.66,side:THREE.DoubleSide}));
      patch.position.y = .45; layer.add(patch);
      // Curved dune contours make the desert overlay legible beyond a color change.
      const bounds = new THREE.Box3().setFromObject(patch);
      for (let row=0;row<6;row++) {
        const lat = Math.min(...area.map(c=>c[1])) + .25 + row*.45;
        const points=[];
        for(let lon=Math.min(...area.map(c=>c[0]));lon<Math.max(...area.map(c=>c[0]));lon+=.12) {
          const p=[lon, lat+Math.sin(lon*3+row)*.07];
          if(inside(p,area)) points.push(toWorld(p,.48));
        }
        if(points.length>1) layer.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#986730'})));
      }
    }
    group.add(layer); layerGroups[key] = layer;
  }

  let selected = null, disposed = false, raf = 0;
  let pointerDown = null, targetTilt = 0, tilt = 0, zoom = 1;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function render() {
    if (disposed) return;
    tilt += (targetTilt-tilt) * (reducedMotion ? 1 : .18);
    group.rotation.y = tilt;
    group.updateMatrixWorld(); camera.updateMatrixWorld();
    const {width, height} = canvas.getBoundingClientRect();
    for (const [id, element] of Object.entries(labels)) {
      const world = toWorld(regions[id].coordinate, .7).applyMatrix4(group.matrixWorld).project(camera);
      element.style.left = `${(world.x*.5+.5)*width}px`;
      element.style.top = `${(-world.y*.5+.5)*height}px`;
    }
    renderer.render(scene, camera);
    if (Math.abs(targetTilt-tilt)>.0002) raf = requestAnimationFrame(render);
    else raf = 0;
  }
  function invalidate() { if (!raf && !disposed) raf = requestAnimationFrame(render); }
  function resize() {
    const {width, height} = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect=width/height;
    const distance = (camera.aspect < 1 ? 31 / Math.max(camera.aspect,.64) : 23.5) / zoom;
    camera.position.set(0, distance*.77, distance*.66);
    camera.lookAt(0,0,-.1); camera.updateProjectionMatrix(); invalidate();
  }
  function hover(id) {
    if(selected===id) return;
    selected=id;
    for(const mesh of selectable) {
      const active=mesh.userData.region===id;
      mesh.material[0].color.set(active ? '#f5cb8b' : activeColor);
      mesh.material[0].emissive.set(active ? '#8e5b21' : '#000000');
      mesh.material[0].emissiveIntensity = active ? .35 : 0;
    }
    for(const [key, lines] of Object.entries(borders)) for(const line of lines) line.material.opacity=key===id?1:.65;
    canvas.style.cursor=id?'pointer':'grab'; onHover(id); invalidate();
  }
  function hit(event) {
    const rect=canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    return raycaster.intersectObjects(selectable)[0]?.object.userData.region || null;
  }
  const move=event=>{
    if(pointerDown && event.buttons===1) {
      const delta=event.clientX-pointerDown.x;
      if(Math.abs(delta)>5) pointerDown.dragged=true;
      targetTilt=THREE.MathUtils.clamp(pointerDown.tilt+delta*.0015,-.18,.18); invalidate();
    } else hover(hit(event));
  };
  const down=event=>{pointerDown={x:event.clientX,tilt:targetTilt,dragged:false};canvas.setPointerCapture(event.pointerId);};
  const up=event=>{if(pointerDown&&!pointerDown.dragged){const id=hit(event);if(id)onSelect(id);}pointerDown=null;};
  const leave=()=>{if(!pointerDown)hover(null);};
  const cancel=()=>{pointerDown=null;};
  const wheel=event=>{
    // A modified wheel gesture is bounded; ordinary scrolling remains available.
    if(!event.ctrlKey) return;
    event.preventDefault(); zoom=THREE.MathUtils.clamp(zoom-event.deltaY*.001,.9,1.12);resize();
  };
  const lost=event=>{event.preventDefault();onFailure();};
  canvas.addEventListener('pointermove',move); canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointerup',up); canvas.addEventListener('pointerleave',leave);
  canvas.addEventListener('pointercancel',cancel); canvas.addEventListener('wheel',wheel,{passive:false});
  canvas.addEventListener('webglcontextlost',lost);
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  return {
    hover,
    setLayers(enabled) {for(const [id,layer] of Object.entries(layerGroups))layer.visible=enabled.includes(id);invalidate();},
    dispose() {
      disposed=true;cancelAnimationFrame(raf);observer.disconnect();
      for(const [event,handler] of [['pointermove',move],['pointerdown',down],['pointerup',up],['pointerleave',leave],['pointercancel',cancel],['wheel',wheel],['webglcontextlost',lost]])canvas.removeEventListener(event,handler);
      const geometries=new Set(),materials=new Set();
      scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();renderer.dispose();
    },
  };
}
