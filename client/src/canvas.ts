import * as three from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import GUI from "lil-gui";

declare global {
  interface Window {
    gltfObject: File | null;
  }
}
window["gltfObject"] = null;

/**
 * Base
 */
// Debug
const gui = new GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

// Scene
const scene = new three.Scene();

/**
 * Textures
 */
const textureLoader = new three.TextureLoader();
const textureMap = {};
/**

 * Test cube
 */
const cube: three.Mesh<three.BoxGeometry, three.MeshBasicMaterial> =
  new three.Mesh(new three.BoxGeometry(1, 1, 1), new three.MeshBasicMaterial());
scene.add(cube);

/**
 * GLTF
 */
const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("three/examples/jsm/libs/draco/");
console.log(dracoLoader);
gltfLoader.setDRACOLoader(dracoLoader);

// you might ask if I need all these if checks
// no, but typescript is annoying with this
const loadGltf = () => {
  if (!window.gltfObject) throw new Error("No Gltf Available or selected!");

  const fileReader = new FileReader();
  fileReader.onload = ({ target }) => {
    if (target) {
      const { result } = target;

      if (result) {
        gltfLoader.parse(
          result,
          "",
          (model) => console.log(model),
          (error) => console.error(error)
        );
      }
    }
  };
  fileReader.readAsText(window.gltfObject);
};

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new three.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(3, 3, 3);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new three.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const clock = new three.Clock();

const tick = (): void => {
  const elapsedTime = clock.getElapsedTime();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();

const gltfInput = document.querySelector("#gltf-input") as HTMLInputElement;

gltfInput?.addEventListener("change", ({ target }) => {
  if (!target) return new Error("No files selected");

  if ("files" in target && target instanceof HTMLInputElement) {
    if (target.files) {
      const [file] = target.files;
      console.log(file);
      window.gltfObject = file;
      loadGltf();
    }
  }
});
