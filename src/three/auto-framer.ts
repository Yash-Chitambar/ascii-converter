import * as THREE from "three";

/**
 * Automatically positions and orients a PerspectiveCamera so that all meshes
 * in the scene are fully visible with the given padding multiplier.
 *
 * @param camera  The camera to reposition.
 * @param scene   The Three.js scene containing the loaded model.
 * @param padding Multiplier applied to the bounding sphere radius (default 1.2 = 20% padding).
 */
export function autoFrameCamera(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  padding = 1.2
): void {
  // Compute the bounding box of all meshes in the scene
  const box = new THREE.Box3();
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      box.expandByObject(obj);
    }
  });

  if (box.isEmpty()) return;

  const center = new THREE.Vector3();
  box.getCenter(center);

  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);

  // Distance required for the bounding sphere to fill the viewport (vertical FOV)
  const fovRad = (camera.fov * Math.PI) / 180;
  const distance = (sphere.radius * padding) / Math.tan(fovRad / 2);

  // Position camera along the +Z axis from the center of the model
  camera.position.set(center.x, center.y, center.z + distance);
  camera.lookAt(center);
  camera.near = distance / 100;
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
}
