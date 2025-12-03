/* Reasoning: Kept the existing AR try-on pipeline intact while adding lazy-loading for TensorFlow
   face landmarks, per-product anchor configuration and smoothing overrides, and lightweight UI
   controls (brightness, camera flip, upload trigger, snapshot persistence) used by the new shop flow. */
/* global Webcam, faceLandmarksDetection */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const webcamElement = document.getElementById("webcam");
const canvasElement = document.getElementById("canvas");
const webcam = new Webcam(webcamElement, "user");
let selectedAccessory = $(".selected-accessory img");
let isVideo = false;
let model = null;
let cameraFrame = null;
let detectFace = false;
let clearAccessories = false;
let accessoryArray = [];
let scene;
let camera;
let renderer;
let obControls;
// Face-landmarks anchor indices (MediaPipe facemesh reference)
// These are intentionally centralised so different jewellery categories
// (necklace, maang-tikka, earrings, nose pins, etc.) can share anchors.
let anchorKeyPoints = {
  forehead: 10, // upper forehead / hairline
  neckBase: 152, // chin / lower face, approximates neck base in camera view
  noseTip: 1, // nose bridge / tip region
  leftCheek: 234,
  rightCheek: 454,
  leftTemple: 127, // near left ear / temple
  rightTemple: 356, // near right ear / temple
};

// Internal cache to avoid re-requesting heavy ML bundles between AR sessions.
let faceMeshDepsPromise = null;

async function ensureFaceMeshDependencies() {
  if (window.faceLandmarksDetection) {
    return;
  }
  if (faceMeshDepsPromise) {
    return faceMeshDepsPromise;
  }

  const scripts = [
    "https://unpkg.com/@tensorflow/tfjs-core@2.4.0/dist/tf-core.min.js",
    "https://unpkg.com/@tensorflow/tfjs-converter@2.4.0/dist/tf-converter.min.js",
    "https://unpkg.com/@tensorflow/tfjs-backend-webgl@2.4.0/dist/tf-backend-webgl.min.js",
    "https://unpkg.com/@tensorflow/tfjs-backend-cpu@2.4.0/dist/tf-backend-cpu.min.js",
    "https://unpkg.com/@tensorflow-models/face-landmarks-detection@0.0.1/dist/face-landmarks-detection.min.js",
  ];

  faceMeshDepsPromise = scripts.reduce((chain, src) => {
    return chain.then(
      () =>
        new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Failed to load script: " + src));
          document.head.appendChild(script);
        })
    );
  }, Promise.resolve());

  return faceMeshDepsPromise;
}

/**
 * Returns the primary anchor point and configuration for a given accessory type.
 * This allows us to support different jewellery categories from the same face mesh.
 */
function getAnchorConfig(accessoryType, face) {
  const type = (accessoryType || "").toLowerCase();

  // Default configuration uses neckBase for necklaces/strands
  const baseConfig = {
    anchorIndex: anchorKeyPoints.neckBase,
    // Additional vertical offset in face-landmarks units; can be tuned per type
    offsetY: 0,
  };

  switch (type) {
    case "forehead":
    case "maang-tikka":
    case "maangtikka":
      return { anchorIndex: anchorKeyPoints.forehead, offsetY: -10 };

    case "earring":
    case "earrings":
    case "earring-left":
      return { anchorIndex: anchorKeyPoints.leftTemple, offsetY: -5 };

    case "earring-right":
      return { anchorIndex: anchorKeyPoints.rightTemple, offsetY: -5 };

    case "nose":
    case "nose-pin":
    case "nosepin":
      return { anchorIndex: anchorKeyPoints.noseTip, offsetY: -2 };

    case "ring":
    case "finger-ring":
      // Facemesh does not track hands; for now we softly pin near the chin
      // so product teams can still demo the flow.
      return { anchorIndex: anchorKeyPoints.neckBase, offsetY: 12 };

    case "necklace":
    case "mangalsutra":
    case "chain":
    default:
      return baseConfig;
  }
}

// Simple temporal smoothing state to make AR feel less jittery
const lastTransforms = new WeakMap();
const SMOOTHING_ALPHA = 0.25; // 0 = no update, 1 = no smoothing

$(document).ready(function () {
  setup3dScene();
  setup3dCamera();
  setupAccessoryMesh();

  // Lightweight AR UI controls used by the shop product flow.
  const brightnessSlider = document.getElementById("lux-ar-brightness");
  if (brightnessSlider) {
    const applyBrightness = (value) => {
      const v = parseFloat(value);
      const factor = isNaN(v) ? 1 : v;
      $("#webcam, #canvas").css("filter", "brightness(" + factor + ")");
    };
    applyBrightness(brightnessSlider.value);
    brightnessSlider.addEventListener("input", function () {
      applyBrightness(this.value);
    });
  }

  const flipButton = document.getElementById("lux-ar-flip-camera");
  if (flipButton) {
    flipButton.addEventListener("click", function () {
      if (!isVideo) return;
      webcam
        .stop()
        .then(() => {
          webcam.flip();
          return webcam.start();
        })
        .then(() => {
          console.log("webcam flipped");
          isVideo = true;
          detectFace = true;
        })
        .catch((err) => {
          console.error("Failed to flip camera", err);
          displayError();
        });
    });
  }

  const uploadTrigger = document.getElementById("lux-ar-source-upload");
  const uploadInput = document.getElementById("lux-ar-upload-input");
  if (uploadTrigger && uploadInput) {
    uploadTrigger.addEventListener("click", function () {
      uploadInput.click();
    });
    uploadInput.addEventListener("change", function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        const url = ev.target && ev.target.result;
        if (!url) return;
        $("#image-container").css("background-image", "url(" + url + ")");
        $("#image-container").css("background-size", "cover");
        $("#image-container").css("background-position", "center");
        // For uploaded photo we pause live camera to avoid confusion.
        if (isVideo) {
          $("#webcam-switch").prop("checked", false).change();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  const cameraSourceBtn = document.getElementById("lux-ar-source-camera");
  if (cameraSourceBtn) {
    cameraSourceBtn.addEventListener("click", function () {
      $("#image-container").css("background-image", "none");
      if (!isVideo) {
        $("#webcam-switch").prop("checked", true).change();
      }
    });
  }

  const saveSnapshotBtn = document.getElementById("lux-ar-save-snapshot");
  if (saveSnapshotBtn) {
    saveSnapshotBtn.addEventListener("click", function () {
      try {
        const dataUrl = webcam.snap();
        if (!dataUrl) {
          console.warn("Snapshot failed – no frame available");
          return;
        }
        const meta = {
          image: dataUrl,
          createdAt: new Date().toISOString(),
          productId: selectedAccessory
            ? selectedAccessory.attr("data-product-id") || null
            : null,
          shopId: selectedAccessory
            ? selectedAccessory.attr("data-shop-id") || null
            : null,
          anchorPoint: selectedAccessory
            ? selectedAccessory.attr("data-anchor-point") ||
              selectedAccessory.attr("data-accessory-type") ||
              null
            : null,
        };
        try {
          const existing =
            JSON.parse(
              window.localStorage.getItem("luxTryOnSnapshots") || "[]"
            ) || [];
          existing.push(meta);
          window.localStorage.setItem(
            "luxTryOnSnapshots",
            JSON.stringify(existing)
          );
        } catch (e) {
          console.warn("Unable to persist snapshot metadata", e);
        }

        // Offer a direct download for the current user session.
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "lux-tryon-snapshot.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error("Snapshot failed", e);
      }
    });
  }
});

$("#webcam-switch").change(function () {
  if (this.checked) {
    $(".md-modal").addClass("md-show");
    webcam
      .start()
      .then((result) => {
        console.log("webcam started");
        isVideo = true;
        cameraStarted();
        switchSource();
        startVTGlasses();
      })
      .catch((err) => {
        displayError();
      });
  } else {
    webcam.stop();
    if (cameraFrame != null) {
      clearAccessories = true;
      detectFace = false;
      cancelAnimationFrame(cameraFrame);
      cameraFrame = null;
    }
    isVideo = false;
    switchSource();
    cameraStopped();
    console.log("webcam stopped");
  }
});

$("#arrowLeft").click(function () {
  let itemWidth =
    parseInt($("#jewelry-list ul li").css("width")) +
    parseInt($("#jewelry-list ul li").css("margin-left")) +
    parseInt($("#jewelry-list ul li").css("margin-right"));
  let marginLeft = parseInt($("#jewelry-list ul").css("margin-left"));
  $("#jewelry-list ul").css({
    "margin-left": marginLeft + itemWidth + "px",
    transition: "0.3s",
  });
});

$("#arrowRight").click(function () {
  let itemWidth =
    parseInt($("#jewelry-list ul li").css("width")) +
    parseInt($("#jewelry-list ul li").css("margin-left")) +
    parseInt($("#jewelry-list ul li").css("margin-right"));
  let marginLeft = parseInt($("#jewelry-list ul").css("margin-left"));
  $("#jewelry-list ul").css({
    "margin-left": marginLeft - itemWidth + "px",
    transition: "0.3s",
  });
});

$("#jewelry-list ul li").click(function () {
  $(".selected-accessory").removeClass("selected-accessory");
  $(this).addClass("selected-accessory");
  selectedAccessory = $(".selected-accessory img");
  clearCanvas();
  if (!isVideo) {
    setupAccessoryMesh();
    setup3dAnimate();
  }
});

$("#closeError").click(function () {
  $("#webcam-switch").prop("checked", false).change();
});

async function startVTGlasses() {
  $(".loading").removeClass("d-none");
  try {
    await ensureFaceMeshDependencies();
    model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
    );
    console.log("model loaded");
    detectFace = isVideo && webcam.facingMode === "user";
    await detectFaces();
  } catch (err) {
    console.error("face mesh load failed", err);
    displayError(
      "Fail to load face mesh model<br/>Please refresh the page to try again"
    );
  } finally {
    $(".loading").addClass("d-none");
  }
}

async function detectFaces() {
  let inputElement = webcamElement;
  let flipHorizontal = !isVideo;

  await model
    .estimateFaces({
      input: inputElement,
      returnTensors: false,
      flipHorizontal: flipHorizontal,
      predictIrises: false,
    })
    .then((faces) => {
      // Normalise falsy responses and guard against empty frames
      const detectedFaces = Array.isArray(faces) ? faces : [];
      if (!detectedFaces.length) {
        if (clearAccessories) {
          clearCanvas();
          clearAccessories = false;
        }
        if (detectFace) {
          cameraFrame = requestAnimFrame(detectFaces);
        }
        return;
      }

      drawAccessories(detectedFaces).then(() => {
        if (clearAccessories) {
          clearCanvas();
          clearAccessories = false;
        }
        if (detectFace) {
          cameraFrame = requestAnimFrame(detectFaces);
        }
      });
    });
}

async function drawAccessories(faces) {
  if (isVideo && accessoryArray.length != faces.length) {
    clearCanvas();
    for (let j = 0; j < faces.length; j++) {
      await setupAccessoryMesh();
    }
  }

  for (let i = 0; i < faces.length; i++) {
    let accessory = accessoryArray[i];
    let face = faces[i];
    if (typeof accessory !== "undefined" && typeof face !== "undefined") {
      const accessoryType = selectedAccessory.attr("data-accessory-type");

      // Per-product anchorConfig overrides from data attributes (used by shop product AR).
      const anchorPointOverride =
        selectedAccessory.attr("data-anchor-point") || "";
      const offsetXOverride = parseFloat(
        selectedAccessory.attr("data-offset-x") || 0
      );
      const offsetY = parseFloat(selectedAccessory.attr("data-offset-y") || 0);
      const offsetZ = parseFloat(selectedAccessory.attr("data-offset-z") || 0);
      const baseScaleOverride = parseFloat(
        selectedAccessory.attr("data-base-scale") || "0"
      );
      const scaleFactor =
        baseScaleOverride ||
        parseFloat(selectedAccessory.attr("data-scale")) ||
        0.02;

      // Map high-level anchor names (neck, forehead, leftEar, rightEar, nose, finger)
      // to underlying facemesh indices while keeping the legacy accessoryType mapping
      // as a safe default.
      let anchorIndex;
      let typeOffsetY = 0;
      const lowerAnchor = anchorPointOverride.toLowerCase();
      if (lowerAnchor) {
        switch (lowerAnchor) {
          case "forehead":
            anchorIndex = anchorKeyPoints.forehead;
            typeOffsetY = -10;
            break;
          case "neck":
          case "neckbase":
            anchorIndex = anchorKeyPoints.neckBase;
            typeOffsetY = 0;
            break;
          case "nose":
            anchorIndex = anchorKeyPoints.noseTip;
            typeOffsetY = -2;
            break;
          case "leftear":
          case "left-ear":
            anchorIndex = anchorKeyPoints.leftTemple;
            typeOffsetY = -5;
            break;
          case "rightear":
          case "right-ear":
            anchorIndex = anchorKeyPoints.rightTemple;
            typeOffsetY = -5;
            break;
          case "finger":
          case "hand":
            anchorIndex = anchorKeyPoints.neckBase;
            typeOffsetY = 12;
            break;
          default: {
            const cfg = getAnchorConfig(accessoryType, face);
            anchorIndex = cfg.anchorIndex;
            typeOffsetY = cfg.offsetY;
            break;
          }
        }
      } else {
        const cfg = getAnchorConfig(accessoryType, face);
        anchorIndex = cfg.anchorIndex;
        typeOffsetY = cfg.offsetY;
      }

      const anchor = face.scaledMesh[anchorIndex];
      const leftCheek = face.scaledMesh[anchorKeyPoints.leftCheek];
      const rightCheek = face.scaledMesh[anchorKeyPoints.rightCheek];
      const faceWidth = Math.sqrt(
        (leftCheek[0] - rightCheek[0]) ** 2 +
          (leftCheek[1] - rightCheek[1]) ** 2 +
          (leftCheek[2] - rightCheek[2]) ** 2
      );

      const target = {
        x: anchor[0] + offsetXOverride,
        y: -anchor[1] - offsetY - typeOffsetY,
        z: -camera.position.z + anchor[2] + offsetZ,
        scale: faceWidth * scaleFactor,
      };

      const previous = lastTransforms.get(accessory) || target;
      const perProductAlpha = parseFloat(
        selectedAccessory.attr("data-smoothing-alpha") || "0"
      );
      const alpha =
        perProductAlpha > 0 && perProductAlpha <= 1
          ? perProductAlpha
          : SMOOTHING_ALPHA;
      const lerp = (prev, next) => prev + (next - prev) * alpha;

      const smoothed = {
        x: lerp(previous.x, target.x),
        y: lerp(previous.y, target.y),
        z: lerp(previous.z, target.z),
        scale: lerp(previous.scale, target.scale),
      };

      accessory.position.set(smoothed.x, smoothed.y, smoothed.z);
      accessory.scale.set(smoothed.scale, smoothed.scale, smoothed.scale);
      accessory.rotation.set(0, Math.PI, 0);

      lastTransforms.set(accessory, smoothed);

      renderer.render(scene, camera);
    }
  }
}

function clearCanvas() {
  for (var i = scene.children.length - 1; i >= 0; i--) {
    var obj = scene.children[i];
    if (obj.type == "Group") {
      scene.remove(obj);
    }
  }
  renderer.render(scene, camera);
  accessoryArray = [];
}

function switchSource() {
  clearCanvas();
  let containerElement;
  if (isVideo) {
    containerElement = $("#webcam-container");
  } else {
    containerElement = $("#image-container");
    setupAccessoryMesh();
  }
  setup3dCamera();
  $("#canvas").appendTo(containerElement);
  $(".loading").appendTo(containerElement);
  $("#jewelry-slider").appendTo(containerElement);
}

function setup3dScene() {
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    alpha: true,
  });
  //light
  var frontLight = new THREE.SpotLight(0xffffff, 0.3);
  frontLight.position.set(10, 10, 10);
  scene.add(frontLight);
  var backLight = new THREE.SpotLight(0xffffff, 0.3);
  backLight.position.set(10, 10, -10);
  scene.add(backLight);
}

function setup3dCamera() {
  if (isVideo) {
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    let videoWidth = webcamElement.width;
    let videoHeight = webcamElement.height;
    camera.position.x = videoWidth / 2;
    camera.position.y = -videoHeight / 2;
    camera.position.z = -(videoHeight / 2) / Math.tan(45 / 2);
    camera.lookAt({
      x: videoWidth / 2,
      y: -videoHeight / 2,
      z: 0,
      isVector3: true,
    });
    renderer.setSize(videoWidth, videoHeight);
    renderer.setClearColor(0x000000, 0);
  } else {
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 1.5);
    camera.lookAt(scene.position);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x3399cc, 1);
    obControls = new OrbitControls(camera, renderer.domElement);
  }
  let cameraExists = false;
  scene.children.forEach(function (child) {
    if (child.type == "PerspectiveCamera") {
      cameraExists = true;
    }
  });
  if (!cameraExists) {
    camera.add(new THREE.PointLight(0xffffff, 0.8));
    scene.add(camera);
  }
  setup3dAnimate();
}

async function setupAccessoryMesh() {
  return new Promise((resolve) => {
    const assetType = (
      selectedAccessory.attr("data-3d-type") || "procedural"
    ).toLowerCase();

    if (assetType === "gltf") {
      const src = selectedAccessory.attr("data-3d-src");
      if (!src) {
        console.warn("No GLTF source provided for accessory.");
        const fallbackGroup = buildAccessoryGroup();
        scene.add(fallbackGroup);
        accessoryArray.push(fallbackGroup);
        resolve("fallback");
        return;
      }
      const loader = new GLTFLoader();
      loader.load(
        src,
        (gltf) => {
          const group = new THREE.Group();
          group.add(gltf.scene);
          scene.add(group);
          accessoryArray.push(group);
          resolve("loaded");
        },
        undefined,
        (error) => {
          console.error("Failed to load accessory GLTF", error);
          const fallbackGroup = buildAccessoryGroup();
          scene.add(fallbackGroup);
          accessoryArray.push(fallbackGroup);
          resolve("fallback");
        }
      );
    } else if (assetType === "image") {
      const src = selectedAccessory.attr("data-image-src");
      if (!src) {
        console.warn("No image source provided for accessory.");
        const fallbackGroup = buildAccessoryGroup();
        scene.add(fallbackGroup);
        accessoryArray.push(fallbackGroup);
        resolve("fallback");
        return;
      }

      const loader = new THREE.TextureLoader();
      loader.load(
        src,
        (texture) => {
          const aspect =
            texture.image && texture.image.width
              ? texture.image.height / texture.image.width
              : 1;
          const plane = new THREE.PlaneGeometry(1, aspect);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
          });
          const mesh = new THREE.Mesh(plane, material);
          const group = new THREE.Group();
          group.add(mesh);
          scene.add(group);
          accessoryArray.push(group);
          resolve("loaded");
        },
        undefined,
        (error) => {
          console.error("Failed to load accessory image", error);
          const fallbackGroup = buildAccessoryGroup();
          scene.add(fallbackGroup);
          accessoryArray.push(fallbackGroup);
          resolve("fallback");
        }
      );
    } else {
      const accessoryGroup = buildAccessoryGroup();
      scene.add(accessoryGroup);
      accessoryArray.push(accessoryGroup);
      resolve("loaded");
    }
  });
}

function buildAccessoryGroup() {
  const geometryType = selectedAccessory.attr("data-geometry") || "torus";
  const color = selectedAccessory.attr("data-color") || "#ffffff";
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.85,
    roughness: 0.25,
  });
  const group = new THREE.Group();

  switch (geometryType) {
    case "strand": {
      const strand = new THREE.TorusGeometry(35, 1.6, 20, 120);
      group.add(new THREE.Mesh(strand, material));
      const beadMaterial = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        metalness: 0.2,
        roughness: 0.6,
      });
      for (let i = -3; i <= 3; i++) {
        const bead = new THREE.Mesh(
          new THREE.SphereGeometry(2.4, 24, 24),
          beadMaterial
        );
        bead.position.set(i * 4, -6, 0);
        group.add(bead);
      }
      break;
    }
    case "choker": {
      const choker = new THREE.TorusGeometry(28, 3.5, 24, 120);
      group.add(new THREE.Mesh(choker, material));
      break;
    }
    case "pendant": {
      const stem = new THREE.CylinderGeometry(1.2, 1.2, 16, 16);
      const stemMesh = new THREE.Mesh(stem, material);
      stemMesh.position.y = 6;
      group.add(stemMesh);

      const gemMaterial = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.5,
        roughness: 0.1,
        emissive: color,
        emissiveIntensity: 0.2,
      });
      const gem = new THREE.SphereGeometry(4.5, 32, 32);
      const gemMesh = new THREE.Mesh(gem, gemMaterial);
      gemMesh.position.y = -2;
      group.add(gemMesh);
      break;
    }
    case "drop": {
      const base = new THREE.ConeGeometry(4, 10, 24);
      const baseMesh = new THREE.Mesh(base, material);
      baseMesh.position.y = -4;
      group.add(baseMesh);
      const cap = new THREE.SphereGeometry(3, 24, 24);
      const capMesh = new THREE.Mesh(cap, material);
      capMesh.position.y = 2;
      group.add(capMesh);
      break;
    }
    case "torus":
    default: {
      const torus = new THREE.TorusGeometry(40, 3, 24, 140);
      group.add(new THREE.Mesh(torus, material));
    }
  }

  return group;
}

var setup3dAnimate = function () {
  if (!isVideo) {
    requestAnimationFrame(setup3dAnimate);
    obControls.update();
  }
  renderer.render(scene, camera);
};
