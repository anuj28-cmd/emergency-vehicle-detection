import cv2
import numpy as np
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
import os

# Data augmentation and preprocessing
train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest',
    validation_split=0.2  # This will use 20% of data for validation
)

# Validation data should have minimal augmentation
val_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input
)

# Set up data generators
batch_size = 32
img_height = 224
img_width = 224

# Use the new vehicle_classification_dataset
dataset_dir = 'vehicle_classification_dataset'
train_generator = train_datagen.flow_from_directory(
    dataset_dir,
    target_size=(img_height, img_width),
    batch_size=batch_size,
    class_mode='categorical',
    subset='training'
)

validation_generator = train_datagen.flow_from_directory(
    dataset_dir,
    target_size=(img_height, img_width),
    batch_size=batch_size,
    class_mode='categorical',
    subset='validation'
)

# Print class mapping
print("\nClass mapping:", train_generator.class_indices)
print("Numbers of training samples:", train_generator.samples)
print("Number of validation samples:", validation_generator.samples)

# Create the model
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(1024, activation='relu')(x)
predictions = Dense(2, activation='softmax')(x)  # 2 classes (emergency vs normal)
model = Model(inputs=base_model.input, outputs=predictions)

# Fine-tuning: Freeze early layers and train later layers
for layer in base_model.layers[:-20]:
    layer.trainable = False

# Compile the model
model.compile(
    optimizer=Adam(learning_rate=0.0001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Define callbacks for better training
callbacks = [
    EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
    ModelCheckpoint('emergency_vehicle_model.h5', monitor='val_accuracy', save_best_only=True)
]

# Train the model
if __name__ == "__main__":
    print("Starting model training...")
    
    history = model.fit(
        train_generator,
        epochs=25,  
        validation_data=validation_generator,
        callbacks=callbacks,
        verbose=1
    )
    
    # Save the model - this is a backup, ModelCheckpoint will save the best model
    model.save('emergency_vehicle_model_final.h5')
    print("\nModel saved as 'emergency_vehicle_model_final.h5'")
    print("Best model saved as 'emergency_vehicle_model.h5'")