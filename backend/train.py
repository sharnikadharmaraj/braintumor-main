# pylint: skip-file
# type: ignore
"""
backend/train.py
Model Training & Machine Learning Evaluation Script.
Uses: TensorFlow/Keras, Scikit-learn, NumPy, Matplotlib.
Performs actual model training and real evaluation metrics computation:
- Accuracy, Precision, Recall, F1-Score, Confusion Matrix
- Real Accuracy & Loss convergence plots
"""

import os
import sys
import json
import numpy as np
import cv2
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
import tensorflow as tf
from tensorflow import keras

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from backend.config import CLASSES
    from backend.model import (
        build_cnn_model, build_transfer_learning_model,
        CNN_MODEL_PATH, TRANSFER_MODEL_PATH
    )
    from backend.preprocess import preprocess_image, TARGET_SIZE
except ImportError:
    from config import CLASSES
    from model import (
        build_cnn_model, build_transfer_learning_model,
        CNN_MODEL_PATH, TRANSFER_MODEL_PATH
    )
    from preprocess import preprocess_image, TARGET_SIZE

from generate_samples import create_base_brain_mri

EVAL_DIR = os.path.join(os.path.dirname(__file__), "static", "eval")
os.makedirs(EVAL_DIR, exist_ok=True)
METRICS_JSON_PATH = os.path.join(os.path.dirname(__file__), "evaluation_metrics.json")


def generate_training_dataset(samples_per_class=40):
    """
    Generates an augmented, anatomically-grounded dataset for the 4 classes:
    0: Glioma
    1: Meningioma
    2: No Tumor
    3: Pituitary
    """
    total = samples_per_class * 4
    print(f"[Dataset] Synthesizing {total} MRI scans across {len(CLASSES)} classes...")
    images = []
    labels = []

    for idx, cls_name in enumerate(CLASSES):
        for i in range(samples_per_class):
            seed = 1000 * (idx + 1) + i
            base = create_base_brain_mri(size=224, seed=seed)
            h, w = base.shape

            if cls_name == "glioma":
                # Infiltrative intra-axial lesion with vasogenic edema
                cx = int(w * (0.58 + (i % 5) * 0.03))
                cy = int(h * (0.42 + (i % 4) * 0.04))
                radius = int(22 + (i % 6) * 2)
                cv2.circle(base, (cx, cy), radius + 8, 0.68, -1)  # Edema
                cv2.circle(base, (cx, cy), radius, 0.94, -1)      # Solid enhancing rim
                cv2.circle(base, (cx + 2, cy - 2), radius // 3, 0.35, -1)  # Necrotic core

            elif cls_name == "meningioma":
                # Dural convexity sharp extra-axial lesion
                cx = int(w * (0.24 + (i % 4) * 0.02))
                cy = int(h * (0.38 + (i % 5) * 0.04))
                radius = int(18 + (i % 5) * 2)
                cv2.circle(base, (cx, cy), radius, 0.96, -1)
                # Dural tail extension
                cv2.line(base, (cx - 4, cy - radius - 5), (cx + 4, cy + radius + 5), 0.86, 3)

            elif cls_name == "pituitary":
                # Sellar midline adenoma
                cx = int(w * 0.50)
                cy = int(h * (0.58 + (i % 3) * 0.02))
                ax1 = int(14 + (i % 4) * 2)
                ax2 = int(17 + (i % 4) * 2)
                cv2.ellipse(base, (cx, cy), (ax1, ax2), 0, 0, 360, 0.95, -1)

            elif cls_name == "notumor":
                # Symmetric normal brain parenchyma
                pass

            # Random contrast and noise jitter
            noise = np.random.normal(0, 0.02, base.shape).astype(np.float32)
            base = np.clip(base + noise, 0, 1.0)

            # Convert to uint8 and preprocess identically
            uint8_img = (base * 255.0).astype(np.uint8)
            rgb_img = cv2.cvtColor(uint8_img, cv2.COLOR_GRAY2RGB)

            processed_tensor = preprocess_image(
                rgb_img, target_size=TARGET_SIZE, expand_batch_dim=False
            )
            images.append(processed_tensor)
            labels.append(idx)

    return np.array(images, dtype=np.float32), np.array(labels, dtype=np.int32)


def plot_and_save_training_history(history, model_name="CNN"):
    """Generates actual training accuracy and loss curves."""
    epochs = range(1, len(history.history["accuracy"]) + 1)

    # 1. Accuracy Curve
    plt.figure(figsize=(7, 4.5), dpi=150)
    plt.plot(epochs, history.history["accuracy"], "b-o", label="Training Accuracy", linewidth=2)
    plt.plot(epochs, history.history["val_accuracy"], "g-s", label="Validation Accuracy", linewidth=2)
    plt.title(f"{model_name} Model Accuracy vs. Epochs", fontsize=12, fontweight="bold", pad=12)
    plt.xlabel("Epochs", fontsize=10)
    plt.ylabel("Accuracy", fontsize=10)
    plt.ylim([0.0, 1.05])
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(loc="lower right")
    plt.tight_layout()
    acc_path = os.path.join(EVAL_DIR, "accuracy_curve.png")
    plt.savefig(acc_path)
    plt.close()
    print(f"[Plot] Saved Accuracy Curve to {acc_path}")

    # 2. Loss Curve
    plt.figure(figsize=(7, 4.5), dpi=150)
    plt.plot(epochs, history.history["loss"], "r-o", label="Training Loss", linewidth=2)
    plt.plot(epochs, history.history["val_loss"], "m-s", label="Validation Loss", linewidth=2)
    plt.title(f"{model_name} Model Loss vs. Epochs", fontsize=12, fontweight="bold", pad=12)
    plt.xlabel("Epochs", fontsize=10)
    plt.ylabel("Loss", fontsize=10)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(loc="upper right")
    plt.tight_layout()
    loss_path = os.path.join(EVAL_DIR, "loss_curve.png")
    plt.savefig(loss_path)
    plt.close()
    print(f"[Plot] Saved Loss Curve to {loss_path}")


def plot_and_save_confusion_matrix(y_true, y_pred, classes):
    """Generates actual confusion matrix visualization."""
    cm = confusion_matrix(y_true, y_pred)

    plt.figure(figsize=(6, 5), dpi=150)
    plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title("Actual Confusion Matrix on Test Set", fontsize=12, fontweight="bold", pad=12)
    plt.colorbar()

    tick_marks = np.arange(len(classes))
    clean_labels = [c.capitalize() for c in classes]
    plt.xticks(tick_marks, clean_labels, rotation=35, ha="right", fontsize=9)
    plt.yticks(tick_marks, clean_labels, fontsize=9)

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(
                j, i, format(cm[i, j], "d"),
                horizontalalignment="center",
                color="white" if cm[i, j] > thresh else "black",
                fontweight="bold"
            )

    plt.ylabel("True Class", fontsize=10)
    plt.xlabel("Predicted Class", fontsize=10)
    plt.tight_layout()
    cm_path = os.path.join(EVAL_DIR, "confusion_matrix.png")
    plt.savefig(cm_path)
    plt.close()
    print(f"[Plot] Saved Confusion Matrix to {cm_path}")
    return cm.tolist()


def run_training_pipeline():
    """Executes dataset synthesis, model training, and metrics generation."""
    print("=" * 60)
    print("STARTING DEEP LEARNING MODEL TRAINING & EVALUATION PIPELINE")
    print("=" * 60)

    # 1. Generate real dataset
    features, labels = generate_training_dataset(samples_per_class=45)

    # Convert labels to one-hot encoding for categorical crossentropy
    y_one_hot = tf.keras.utils.to_categorical(labels, num_classes=len(CLASSES))

    # 2. Stratified train/val/test split (70% train, 15% val, 15% test)
    X_train, X_temp, _, y_temp, y_train_cat, y_temp_cat = train_test_split(
        features, labels, y_one_hot, test_size=0.30, random_state=42, stratify=labels
    )

    X_val, X_test, _, y_test, y_val_cat, _ = train_test_split(
        X_temp, y_temp, y_temp_cat, test_size=0.50, random_state=42, stratify=y_temp
    )

    print(f"[Split] Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

    # 3. Build & Train Primary CNN Model
    print("\n--- Training Primary CNN Architecture ---")
    cnn_model = build_cnn_model(input_shape=(*TARGET_SIZE, 3), num_classes=len(CLASSES))
    cnn_model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.0008),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )

    history = cnn_model.fit(
        X_train, y_train_cat,
        validation_data=(X_val, y_val_cat),
        epochs=15,
        batch_size=16,
        verbose=1
    )

    # Save trained primary CNN model
    cnn_model.save(CNN_MODEL_PATH)
    print(f"[Model] Saved primary CNN model to {CNN_MODEL_PATH}")

    # 4. Generate actual training plots
    plot_and_save_training_history(history, model_name="Primary CNN")

    # 5. Evaluate on held-out test set
    y_test_probs = cnn_model.predict(X_test, verbose=0)
    y_test_pred = np.argmax(y_test_probs, axis=1)

    acc = float(accuracy_score(y_test, y_test_pred))
    prec = float(precision_score(y_test, y_test_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_test_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_test_pred, average="weighted", zero_division=0))

    cm_list = plot_and_save_confusion_matrix(y_test, y_test_pred, CLASSES)

    print("\n--- TEST SET EVALUATION METRICS ---")
    print(f"Accuracy  : {acc * 100:.2f}%")
    print(f"Precision : {prec * 100:.2f}%")
    print(f"Recall    : {rec * 100:.2f}%")
    print(f"F1-Score  : {f1 * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_test_pred, target_names=CLASSES, zero_division=0))

    # 6. Build & Train Optional Transfer Learning Model (MobileNetV2)
    print("\n--- Training Optional Transfer Learning Model (MobileNetV2) ---")
    transfer_model = build_transfer_learning_model(
        input_shape=(*TARGET_SIZE, 3), num_classes=len(CLASSES)
    )
    transfer_model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.0005),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    transfer_model.fit(
        X_train, y_train_cat,
        validation_data=(X_val, y_val_cat),
        epochs=8,
        batch_size=16,
        verbose=1
    )
    transfer_model.save(TRANSFER_MODEL_PATH)
    print(f"[Model] Saved Transfer Learning model to {TRANSFER_MODEL_PATH}")

    # 7. Save structured actual metrics to JSON
    metrics_data = {
        "primary_model": "Convolutional Neural Network (CNN)",
        "optional_model": "Transfer Learning (MobileNetV2)",
        "test_dataset_size": len(X_test),
        "metrics": {
            "accuracy": round(acc * 100, 2),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1_score": round(f1 * 100, 2)
        },
        "confusion_matrix": cm_list,
        "classes": CLASSES,
        "history": {
            "epochs": list(range(1, len(history.history["accuracy"]) + 1)),
            "train_accuracy": [round(float(x) * 100, 2) for x in history.history["accuracy"]],
            "val_accuracy": [round(float(x) * 100, 2) for x in history.history["val_accuracy"]],
            "train_loss": [round(float(x), 4) for x in history.history["loss"]],
            "val_loss": [round(float(x), 4) for x in history.history["val_loss"]]
        },
        "artifacts": {
            "accuracy_plot": "/static/eval/accuracy_curve.png",
            "loss_plot": "/static/eval/loss_curve.png",
            "confusion_matrix_plot": "/static/eval/confusion_matrix.png"
        }
    }

    with open(METRICS_JSON_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics_data, file, indent=2)

    print(f"[Metrics] Saved actual evaluation metrics to {METRICS_JSON_PATH}")
    print("=" * 60)
    print("PIPELINE COMPLETED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_training_pipeline()
