import os
import io
import base64
import numpy as np
from PIL import Image
import tensorflow as tf

class GradCam:
    @staticmethod
    def _compute_heatmap(model: tf.keras.Model, img_tensor: tf.Tensor, class_idx: int):
        """Compute raw Grad-CAM heatmap array for the given class index."""
        try:
            layer_names = [l.name for l in model.layers]
            aug = model.get_layer('augmentation') if 'augmentation' in layer_names else None
            eff = model.get_layer('efficientnetb0') if 'efficientnetb0' in layer_names else None
            
            if eff is not None:
                with tf.GradientTape() as tape:
                    x = aug(img_tensor, training=False) if aug is not None else img_tensor
                    feat = eff(x, training=False)
                    tape.watch(feat)
                    
                    y = feat
                    if 'global_average_pooling2d' in layer_names:
                        y = model.get_layer('global_average_pooling2d')(y)
                    if 'dropout' in layer_names:
                        y = model.get_layer('dropout')(y, training=False)
                    if 'dense' in layer_names:
                        y = model.get_layer('dense')(y)
                    if 'dropout_1' in layer_names:
                        y = model.get_layer('dropout_1')(y, training=False)
                    if 'dense_1' in layer_names:
                        preds = model.get_layer('dense_1')(y)
                    else:
                        preds = y
                    loss = preds[:, class_idx]
                
                grads = tape.gradient(loss, feat)
                if grads is not None:
                    pooled = tf.reduce_mean(grads, axis=(0, 1, 2))
                    heatmap = tf.squeeze(feat[0] @ pooled[..., tf.newaxis])
                else:
                    heatmap = tf.reduce_mean(feat[0], axis=-1)
                
                heatmap = tf.maximum(heatmap, 0)
                max_val = tf.reduce_max(heatmap)
                if max_val > 0:
                    heatmap = heatmap / max_val
                return heatmap.numpy()
        except Exception as e:
            print(f"[Grad-CAM] Gradient computation note: {e}")
        
        # Fallback heatmap
        return np.ones((224, 224), dtype=np.float32) * 0.5

    @staticmethod
    def generate_heatmap(model: tf.keras.Model, image_path: str, class_idx: int) -> str:
        """Generate a Base64-encoded PNG of the Grad-CAM overlay."""
        # Load and preprocess image
        img = Image.open(image_path).convert('RGB')
        orig_width, orig_height = img.size
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized, dtype=np.float32)
        img_tensor = tf.expand_dims(tf.convert_to_tensor(img_array), axis=0)

        # Compute heatmap
        heatmap = GradCam._compute_heatmap(model, img_tensor, class_idx)

        # Resize heatmap to original image size
        heatmap_img = Image.fromarray(np.uint8(255 * np.clip(heatmap, 0, 1)))
        heatmap_resized = heatmap_img.resize((orig_width, orig_height), resample=Image.BILINEAR)

        # Colorize heatmap (blend red/orange heat gradient with original)
        hm_data = np.array(heatmap_resized, dtype=np.float32) / 255.0
        
        # Create colormap overlay
        r = np.uint8(np.clip(hm_data * 255 * 1.2, 0, 255))
        g = np.uint8(np.clip((1.0 - np.abs(hm_data - 0.5) * 2) * 180, 0, 255))
        b = np.uint8(np.clip((1.0 - hm_data) * 80, 0, 255))
        alpha = np.uint8(np.clip(hm_data * 180, 0, 180))
        
        rgba_arr = np.dstack((r, g, b, alpha))
        heatmap_rgba = Image.fromarray(rgba_arr, mode='RGBA')

        # Composite over original
        orig_rgba = img.convert('RGBA')
        overlay = Image.alpha_composite(orig_rgba, heatmap_rgba)

        # Encode to PNG + base64
        buffered = io.BytesIO()
        overlay.save(buffered, format='PNG')
        img_bytes = buffered.getvalue()
        b64_str = base64.b64encode(img_bytes).decode('utf-8')
        return b64_str
