# pylint: disable=no-member
"""
generate_samples.py
Generates realistic anatomical brain MRI test scans for 4 diagnostic classes:
1. Glioma (infiltrative hyperintense mass in cerebral cortex with peripheral edema)
2. Meningioma (well-circumscribed, extra-axial dural-based mass)
3. Pituitary (sellar/suprasellar rounded mass near central skull base)
4. No Tumor (symmetric cerebral hemispheres, clear ventricles, no lesions)
"""

import os
import numpy as np
import cv2

def create_base_brain_mri(size=256, seed=42):
    """Generates a synthetic axial base brain MRI parenchyma slice with skull and ventricles."""
    np.random.seed(seed)
    img = np.zeros((size, size), dtype=np.float32)
    center = (size // 2, size // 2)

    # 1. Outer skull contour (elliptical)
    skull_axes = (int(size * 0.40), int(size * 0.44))
    cv2.ellipse(img, center, skull_axes, 0, 0, 360, 0.45, -1)

    # 2. Diploe / Bone marrow (thin bright layer)
    bone_axes = (int(size * 0.38), int(size * 0.42))
    cv2.ellipse(img, center, bone_axes, 0, 0, 360, 0.15, 2)

    # 3. Brain parenchyma / cerebrum (dural boundary)
    brain_axes = (int(size * 0.36), int(size * 0.40))
    cv2.ellipse(img, center, brain_axes, 0, 0, 360, 0.52, -1)

    # 4. Add subtle cortical sulci & gyri folds using Perlin/Gaussian filtered noise
    noise = np.random.normal(0, 0.08, (size, size)).astype(np.float32)
    noise = cv2.GaussianBlur(noise, (9, 9), 3)
    img = np.clip(img + noise * (img > 0.2), 0, 1)

    # 5. Interhemispheric fissure (longitudinal cerebral fissure)
    cv2.line(img, (center[0], center[1] - brain_axes[1] + 10),
                  (center[0], center[1] + brain_axes[1] - 10), 0.25, 2)

    # 6. Lateral ventricles (butterfly / crescent shape in center)
    left_ventricle = np.array([
        [center[0] - 8, center[1] - 25],
        [center[0] - 20, center[1] - 5],
        [center[0] - 18, center[1] + 20],
        [center[0] - 7, center[1] + 5],
        [center[0] - 6, center[1] - 15]
    ], np.int32)
    cv2.fillPoly(img, [left_ventricle], 0.15)

    right_ventricle = np.array([
        [center[0] + 8, center[1] - 25],
        [center[0] + 20, center[1] - 5],
        [center[0] + 18, center[1] + 20],
        [center[0] + 7, center[1] + 5],
        [center[0] + 6, center[1] - 15]
    ], np.int32)
    cv2.fillPoly(img, [right_ventricle], 0.15)

    # 7. Mask outside skull to pure black
    mask = np.zeros((size, size), dtype=np.uint8)
    cv2.ellipse(mask, center, skull_axes, 0, 0, 360, 255, -1)
    img = img * (mask > 0)

    return img

def generate_glioma_scan(size=256, output_path="static/samples/glioma_sample.jpg"):
    """Generates synthetic infiltrative glioma scan with necrotic core and edema."""
    img = create_base_brain_mri(size=size, seed=101)

    # Infiltrative tumor in right temporal/parietal lobe with edema halo
    tx, ty = int(size * 0.65), int(size * 0.45)

    # Edema halo (hypointense/hyperintense diffuse rim)
    cv2.circle(img, (tx, ty), 32, 0.65, -1)
    # Core mass
    cv2.circle(img, (tx, ty), 22, 0.88, -1)
    # Necrotic center
    cv2.circle(img, (tx + 3, ty - 2), 9, 0.40, -1)

    # Irregular edges
    noise = np.random.normal(0, 0.1, (size, size)).astype(np.float32)
    img = cv2.GaussianBlur(img, (3, 3), 0.8) + noise * 0.05
    img = np.clip(img, 0, 1.0)

    save_mri(img, output_path)

def generate_meningioma_scan(size=256, output_path="static/samples/meningioma_sample.jpg"):
    """Generates synthetic extra-axial meningioma scan with dural tail sign."""
    img = create_base_brain_mri(size=size, seed=202)

    # Well-circumscribed, extra-axial dural-based mass on the left convexity
    tx, ty = int(size * 0.24), int(size * 0.42)

    # Sharp, brightly enhancing homogeneous mass
    cv2.circle(img, (tx, ty), 24, 0.95, -1)
    # Dural tail sign
    cv2.line(img, (tx - 5, ty - 25), (tx + 5, ty + 25), 0.85, 3)

    # Mass effect displacing adjacent brain parenchyma slightly
    img = cv2.GaussianBlur(img, (3, 3), 0.6)
    img = np.clip(img, 0, 1.0)

    save_mri(img, output_path)

def generate_pituitary_scan(size=256, output_path="static/samples/pituitary_sample.jpg"):
    """Generates synthetic pituitary adenoma scan centered in sella turcica."""
    img = create_base_brain_mri(size=size, seed=303)

    # Sellar / suprasellar central mass at skull base / optic chiasm region
    tx, ty = int(size * 0.50), int(size * 0.60)

    # Rounded well-defined midline pituitary adenoma
    cv2.ellipse(img, (tx, ty), (16, 20), 0, 0, 360, 0.92, -1)
    cv2.circle(img, (tx, ty), 10, 0.82, -1)

    img = cv2.GaussianBlur(img, (3, 3), 0.6)
    img = np.clip(img, 0, 1.0)

    save_mri(img, output_path)

def generate_healthy_scan(size=256, output_path="static/samples/notumor_sample.jpg"):
    """Generates synthetic healthy brain MRI scan with no tumors."""
    img = create_base_brain_mri(size=size, seed=404)
    # Perfectly symmetric, no focal lesions
    img = cv2.GaussianBlur(img, (3, 3), 0.5)
    img = np.clip(img, 0, 1.0)
    save_mri(img, output_path)

def save_mri(img_arr, path):
    """Saves normalized float32 image array to disk as 3-channel RGB image."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    uint8_img = (img_arr * 255).astype(np.uint8)
    # Save as high-quality grayscale/RGB image
    rgb_img = cv2.cvtColor(uint8_img, cv2.COLOR_GRAY2RGB)
    cv2.imwrite(path, rgb_img)
    print(f"Generated sample MRI scan: {path}")

def generate_all_samples():
    """Batch generates all sample MRI scans for testing and demo."""
    generate_glioma_scan(output_path="static/samples/glioma_sample.jpg")
    generate_meningioma_scan(output_path="static/samples/meningioma_sample.jpg")
    generate_pituitary_scan(output_path="static/samples/pituitary_sample.jpg")
    generate_healthy_scan(output_path="static/samples/notumor_sample.jpg")

    # Additional variants for testing diversity
    generate_glioma_scan(output_path="static/samples/glioma_sample_2.jpg")
    generate_healthy_scan(output_path="static/samples/notumor_sample_2.jpg")

if __name__ == "__main__":
    generate_all_samples()
