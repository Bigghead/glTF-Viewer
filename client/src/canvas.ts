import * as three from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import GUI from "lil-gui";

declare global {
  interface Window {
    gltfObject: {
      gltfFileMap: Map<string, File> | null; // this will store everything in our file drop
      gltfRootFile: File | null;
      gltfRootPath: string;
    };
  }
}
window["gltfObject"] = {
  gltfFileMap: null,
  gltfRootFile: null,
  gltfRootPath: "",
};

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

 * Floor
 */
const floor: three.Mesh<three.BoxGeometry, three.MeshBasicMaterial> =
  new three.Mesh(
    new three.BoxGeometry(10, 0.0001, 10),
    new three.MeshBasicMaterial({
      color: "grey",
    })
  );
scene.add(floor);

/**
 * GLTF
 */
let loadedModel: GLTF | null = null;
const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Todo:
 * 1) Remove previous loaded objects
 * 2) ^ maybe add feature to add multiple models and position them from mouse drag
 */
const loadGltf = () => {
  if (!window.gltfObject) throw new Error("No Gltf Available or selected!");

  const rootFile = window.gltfObject.gltfRootFile;

  // Todo, cover error cases if the rootfile doesn't exist
  const isGlb = rootFile?.name.toLowerCase().includes("glb");

  const fileReader = new FileReader();
  fileReader.onload = ({ target }) => {
    if (target) {
      const { result } = target;

      // this is the magic for the threejs gltfloader taking data from input file
      // 1. Setting the Resource Path for the Loader
      gltfLoader.setResourcePath(window.gltfObject.gltfRootPath);

      // 2. Intercepting and Modifying URL Requests for Assets
      gltfLoader.manager.setURLModifier((url: string) => {
        const combinedPath = url;

        const file = window.gltfObject.gltfFileMap?.get(combinedPath);

        console.log(file, url, window.gltfObject);

        // extra test for the loader to fetch the public draco decoder / loader
        // pathnames like "/draco/draco_wasm_wrapper.js" or /draco/draco_decoder.wasm won't be in the file ^
        if (
          url.includes("/draco/") ||
          url.includes("draco_wasm_wrapper.js") ||
          url.includes("draco_decoder.wasm")
        ) {
          return url;
        }

        if (file) {
          return URL.createObjectURL(file);
        }

        return url;
      });
      // --- End Core Fix ---

      if (result) {
        // 3. then parsing the gltf file, but the gltf is relying on other files in the folder ( png, bin, etc )
        //    this is why the "magic" fixes are needed
        gltfLoader.parse(
          result,
          "",
          (model) => {
            console.log(model);
            scene.add(model.scene);
            loadedModel = model;
          },
          (error) => console.error(error)
        );
      }
    }
  };

  // Glb is array buffer, gltf is literally jsut json / text
  if (isGlb) {
    fileReader.readAsArrayBuffer(rootFile as Blob);
  } else {
    fileReader.readAsText(rootFile as Blob);
  }
};

/**
 * Light / Alwasys forget this with some meshes that need
 */
const ambientLight = new three.AmbientLight("#ffffff", 3);
scene.add(ambientLight);

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

  const fileObject = window.gltfObject;
  fileObject.gltfFileMap = new Map<string, File>();

  if ("files" in target && target instanceof HTMLInputElement) {
    if (target.files) {
      const { files } = target;

      // files is a FileList type, not array
      Array.from(files).forEach((file) => {
        const filePath = file.webkitRelativePath;
        fileObject.gltfFileMap?.set(filePath, file);

        // if file is a glb or a gltf file type
        if (file.name.match(/\.(gltf|glb)$/i)) {
          fileObject.gltfRootFile = file;

          // Extract the directory path (e.g., 'DuckFolder/')
          fileObject.gltfRootPath = filePath.substring(
            0,
            filePath.lastIndexOf("/") + 1
          );
        }
      });
      console.log(window.gltfObject);
      loadGltf();
    }
  }
});

/**
 *
 */
const guiObj = {
  modelScale: 1,
  changeModelScale: (loadedModel: GLTF | null, scale: number): void => {
    if (loadedModel) {
      const { scene } = loadedModel;
      scene.scale.set(scale, scale, scale);
    }
  },
};

gui
  .add(guiObj, "modelScale", 0.05, 5, 0.005)
  .onFinishChange((scale: number) =>
    guiObj.changeModelScale(loadedModel, scale)
  )
  .name("Change Model Scale");
