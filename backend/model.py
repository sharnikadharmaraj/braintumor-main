# pylint: skip-file
# type: ignore
"""
backend/model.py
Deep Learning Architectures using TensorFlow & Keras:
1. Primary Model: Custom Deep Convolutional Neural Network (CNN)
2. Optional Model: Transfer Learning (MobileNetV2)
Configurable via MODEL_TYPE ('CNN' or 'TRANSFER_LEARNING').
"""

import os
import sys
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from backend.config import MODEL_TYPE, CLASSES, CLASS_METADATA
    from backend.preprocess import preprocess_image, TARGET_SIZE
except ImportError:
    from config import MODEL_TYPE, CLASSES, CLASS_METADATA
    from preprocess import preprocess_image, TARGET_SIZE

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

CNN_MODEL_PATH = os.path.join(MODELS_DIR, "cnn_model.keras")
TRANSFER_MODEL_PATH = os.path.join(MODELS_DIR, "transfer_model.keras")


def build_cnn_model(input_shape=(224, 224, 3), num_classes=4) -> keras.Model:
    """
    Primary Deep Learning Model:
    Custom 4-block Convolutional Neural Network designed specifically for MRI feature maps.
    Each block contains Conv2D, BatchNormalization, ReLU activation, and MaxPooling2D.
    """
    inputs = layers.Input(shape=input_shape, name="mri_input")

    # Block 1
    x = layers.Conv2D(32, (3, 3), padding="same", name="conv1_1")(inputs)
    x = layers.BatchNormalization(name="bn1_1")(x)
    x = layers.Activation("relu", name="relu1_1")(x)
    x = layers.Conv2D(32, (3, 3), padding="same", name="conv1_2")(x)
    x = layers.BatchNormalization(name="bn1_2")(x)
    x = layers.Activation("relu", name="relu1_2")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="pool1")(x)
    x = layers.Dropout(0.2, name="drop1")(x)

    # Block 2
    x = layers.Conv2D(64, (3, 3), padding="same", name="conv2_1")(x)
    x = layers.BatchNormalization(name="bn2_1")(x)
    x = layers.Activation("relu", name="relu2_1")(x)
    x = layers.Conv2D(64, (3, 3), padding="same", name="conv2_2")(x)
    x = layers.BatchNormalization(name="bn2_2")(x)
    x = layers.Activation("relu", name="relu2_2")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="pool2")(x)
    x = layers.Dropout(0.25, name="drop2")(x)

    # Block 3
    x = layers.Conv2D(128, (3, 3), padding="same", name="conv3_1")(x)
    x = layers.BatchNormalization(name="bn3_1")(x)
    x = layers.Activation("relu", name="relu3_1")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="pool3")(x)
    x = layers.Dropout(0.3, name="drop3")(x)

    # Block 4
    x = layers.Conv2D(256, (3, 3), padding="same", name="conv4_1")(x)
    x = layers.BatchNormalization(name="bn4_1")(x)
    x = layers.Activation("relu", name="relu4_1")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="pool4")(x)
    x = layers.Dropout(0.35, name="drop4")(x)

    # Classification Head
    x = layers.Flatten(name="flatten")(x)
    x = layers.Dense(512, name="dense_1")(x)
    x = layers.BatchNormalization(name="bn_dense")(x)
    x = layers.Activation("relu", name="relu_dense")(x)
    x = layers.Dropout(0.5, name="drop_dense")(x)

    outputs = layers.Dense(num_classes, activation="softmax", name="output_probabilities")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="Brain_Tumor_Primary_CNN")
    return model


def build_transfer_learning_model(input_shape=(224, 224, 3), num_classes=4) -> keras.Model:
    """
    Transfer Learning Model using pre-trained MobileNetV2 with custom dense classification top.
    """
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet"
    )
    # Freeze base feature extractor
    base_model.trainable = False

    inputs = layers.Input(shape=input_shape, name="transfer_input")
    # Preprocessing specifically for MobileNetV2
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs * 255.0)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D(name="transfer_avg_pool")(x)
    x = layers.Dense(256, activation="relu", name="transfer_dense_1")(x)
    x = layers.Dropout(0.4, name="transfer_drop_1")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="transfer_output")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="Brain_Tumor_Transfer_MobileNetV2")
    return model


class BrainTumorInferenceEngine:
    """Inference engine managing CNN and Transfer Learning models for MRI prediction."""

    def __init__(self, model_type: str = MODEL_TYPE):
        self.model_type = model_type.upper()
        self.model = None
        self.model_path = CNN_MODEL_PATH if self.model_type == "CNN" else TRANSFER_MODEL_PATH
        self._load_or_initialize()

    def _load_or_initialize(self):
        """Loads trained weights from disk if available, or initializes model architecture."""
        if os.path.exists(self.model_path):
            try:
                print(f"[Model] Loading trained {self.model_type} model from {self.model_path}")
                self.model = keras.models.load_model(self.model_path)
                return
            except (IOError, ValueError, RuntimeError) as err:
                print(
                    f"[Model] Warning loading model from {self.model_path} ({err}). "
                    "Creating new instance."
                )

        print(f"[Model] Initializing fresh {self.model_type} model architecture...")
        shape = (*TARGET_SIZE, 3)
        if self.model_type == "TRANSFER_LEARNING":
            self.model = build_transfer_learning_model(
                input_shape=shape, num_classes=len(CLASSES)
            )
        else:
            self.model = build_cnn_model(
                input_shape=shape, num_classes=len(CLASSES)
            )

        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=1e-4),
            loss="categorical_crossentropy",
            metrics=["accuracy"]
        )

    def switch_model_type(self, new_type: str):
        """Switches active inference architecture between CNN and TRANSFER_LEARNING."""
        new_type = new_type.upper()
        if new_type not in ["CNN", "TRANSFER_LEARNING"]:
            raise ValueError(f"Invalid model type: {new_type}")
        self.model_type = new_type
        self.model_path = CNN_MODEL_PATH if self.model_type == "CNN" else TRANSFER_MODEL_PATH
        self._load_or_initialize()

    def predict(self, image_input) -> dict:
        """
        Runs the exact model-compatible preprocessing and prediction pipeline:
        1. Preprocess image: resize (224,224), RGB, normalize [0,1], batch dim [1, 224, 224, 3]
        2. Keras model forward pass
        3. Probability mapping and confidence computation
        """
        # 1. Exact standardized preprocessing
        batch_tensor = preprocess_image(image_input, target_size=TARGET_SIZE, expand_batch_dim=True)

        # 2. Forward pass prediction
        predictions = self.model.predict(batch_tensor, verbose=0)[0]

        # 3. Softmax index & class mapping
        pred_idx = int(np.argmax(predictions))
        pred_class = CLASSES[pred_idx]
        confidence = float(predictions[pred_idx] * 100)

        # Format probability distribution
        probabilities = {}
        for idx, cls_name in enumerate(CLASSES):
            probabilities[cls_name] = {
                "display_name": CLASS_METADATA[cls_name]["title"],
                "percentage": round(float(predictions[idx] * 100), 2)
            }

        meta = CLASS_METADATA[pred_class]

        return {
            "prediction_class": pred_class,
            "display_name": meta["title"],
            "category": meta["category"],
            "confidence": round(confidence, 2),
            "is_tumor": meta["is_tumor"],
            "risk_level": meta["risk_level"],
            "description": meta["description"],
            "probabilities": probabilities,
            "model_type": self.model_type,
            "model_version": f"{self.model_type}-v1.0"
        }


# Global Inference Singleton
detector = BrainTumorInferenceEngine()
