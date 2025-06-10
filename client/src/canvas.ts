import * as three from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import GUI from "lil-gui";

class GUIManager {
  gui = new GUI();
  guiObj = {
    modelScale: 1,
  };
  changeModelScale;

  constructor(changeModelScale: (scale: number) => void) {
    this.changeModelScale = changeModelScale;
    this.initModelScale();
  }

  initModelScale = () => {
    this.gui
      .add(this.guiObj, "modelScale", 0.05, 5, 0.005)
      .onFinishChange((scale: number) => this.changeModelScale(scale))
      .name("Change Model Scale");
  };
}

export class ModelCanvas {
  canvas: HTMLCanvasElement = document.querySelector(
    "canvas.webgl"
  ) as HTMLCanvasElement;
  scene: three.Scene = new three.Scene();
  textureLoader: three.TextureLoader = new three.TextureLoader();
  textureMap: Record<string, three.Texture> = {};
  ambientLight = new three.AmbientLight("#ffffff", 3);
  sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  camera = new three.PerspectiveCamera(
    75,
    this.sizes.width / this.sizes.height,
    0.1,
    100
  );
  controls = new OrbitControls(this.camera, this.canvas);
  renderer = new three.WebGLRenderer({
    canvas: this.canvas,
  });
  clock = new three.Clock();

  loadedModel: GLTF | null = null;
  gltfLoader = new GLTFLoader();

  guiManager: GUIManager;

  constructor() {
    this.init();
    this.initGui();
    this.guiManager = new GUIManager(this.changeModelScale);
  }

  init() {
    const floor = new three.Mesh(
      new three.BoxGeometry(10, 0.0001, 10),
      new three.MeshBasicMaterial({
        color: "grey",
      })
    );
    this.scene.add(floor);
    this.scene.add(this.ambientLight);

    this.camera.position.set(3, 3, 3);
    this.scene.add(this.camera);
    this.controls.enableDamping = true;

    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /**
     * GLTF
     */

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.tick();
  }

  /**
   * Todo:
   * 1) Remove previous loaded objects
   * 2) ^ maybe add feature to add multiple models and position them from mouse drag
   */
  loadGltf = (result: string | ArrayBuffer | null) => {
    this.gltfLoader.setResourcePath(window.gltfObject.gltfRootPath);
    // this is the magic for the threejs gltfloader taking data from input file
    // 1. Setting the Resource Path for the Loader

    // 2. Intercepting and Modifying URL Requests for Assets
    this.gltfLoader.manager.setURLModifier((url: string) => {
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
      this.gltfLoader.parse(
        result,
        "",
        (model) => {
          console.log(model);
          this.scene.add(model.scene);
          this.loadedModel = model;
        },
        (error) => {
          const errorMessage =
            error instanceof ErrorEvent ? error.message : String(error);
          throw new Error("Failed to load GLTF model: " + errorMessage);
        }
      );
    }
  };

  tick = (): void => {
    const elapsedTime = this.clock.getElapsedTime();

    // Update controls
    this.controls.update();

    // Render
    this.renderer.render(this.scene, this.camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(this.tick);
  };

  initGui = (): void => {};

  changeModelScale = (scale: number): void => {
    if (this.loadedModel) {
      const { scene } = this.loadedModel;
      scene.scale.set(scale, scale, scale);
    }
  };

  resizeWindow = (): void => {
    //  Update sizes
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    // Update camera
    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };
}
