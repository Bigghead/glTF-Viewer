import { ModelCanvas } from "./canvas";

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

const canvas = new ModelCanvas();

const gltfInput = document.querySelector("#gltf-input") as HTMLInputElement;

gltfInput?.addEventListener("change", ({ target }) => {
  if (
    !(target instanceof HTMLInputElement) ||
    !target.files ||
    target.files.length === 0
  ) {
    console.warn("No files selected or invalid input target.");
    if (target instanceof HTMLInputElement) {
      target.value = "";
    }
    return;
  }

  const fileObject = window.gltfObject;
  fileObject.gltfFileMap = new Map<string, File>();

  const { files } = target;

  // For checking error if file(s) put in arent able to be processed
  let hasGltfOrGlb = false;

  // files is a FileList type, not array
  Array.from(files).forEach((file) => {
    console.log(file.type);
    const filePath = file.webkitRelativePath;
    fileObject.gltfFileMap?.set(filePath, file);

    // if file is a glb or a gltf file type
    if (file.name.match(/\.(gltf|glb)$/i)) {
      hasGltfOrGlb = true;
      fileObject.gltfRootFile = file;

      // Extract the directory path (e.g., 'DuckFolder/')
      fileObject.gltfRootPath = filePath.substring(
        0,
        filePath.lastIndexOf("/") + 1
      );
    }
  });

  if (!hasGltfOrGlb) {
    // Todo - handle
    console.error(
      "No .gltf or .glb file found in the selection. Please select a folder containing a GLTF model."
    );
    target.value = "";
    return;
  }

  console.log(window.gltfObject);
  onLoadGltf();
});

const onLoadGltf = (): void => {
  if (!window.gltfObject) throw new Error("No Gltf Available or selected!");

  const rootFile = window.gltfObject.gltfRootFile;

  // Todo, cover error cases if the rootfile doesn't exist
  const isGlb = rootFile?.name.toLowerCase().includes("glb");

  const fileReader = new FileReader();
  fileReader.onload = ({ target }) => {
    if (target) {
      const { result } = target;
      canvas.loadGltf(result);
    }
  };

  fileReader.onerror = (e) => {
    const { error } = fileReader;
    if (error) {
      console.error("Unknown FileReader Error Event:", error);
    }
  };

  // Glb is array buffer, gltf is literally jsut json / text
  if (isGlb) {
    fileReader.readAsArrayBuffer(rootFile as Blob);
  } else {
    fileReader.readAsText(rootFile as Blob);
  }
};

window.addEventListener("resize", () => {
  canvas.resizeWindow();
});
