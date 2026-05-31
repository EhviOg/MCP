/** Photo capture via the real device camera (expo-camera). Falls back gracefully if denied. */

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Space } from '@/constants/palette';
import { BigButton } from '@/components/ui-kit';

export function PhotoCapture({
  photoUri,
  onCapture,
}: {
  photoUri: string | null;
  onCapture: (uri: string | null) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const camRef = useRef<CameraView>(null);

  const openCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setOpen(true);
  };

  const snap = async () => {
    try {
      const pic = await camRef.current?.takePictureAsync({ quality: 0.5 });
      if (pic?.uri) onCapture(pic.uri);
    } catch {
      // ignore — operator can retry
    } finally {
      setOpen(false);
    }
  };

  return (
    <View style={{ gap: Space.sm }}>
      {photoUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
          <Pressable style={styles.retake} onPress={openCamera}>
            <Ionicons name="camera-reverse" size={18} color={Palette.text} />
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
        </View>
      ) : (
        <BigButton title="Take photo" icon="camera" variant="secondary" onPress={openCamera} />
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.camWrap}>
          <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
          <View style={styles.camControls}>
            <Pressable style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.shutter} onPress={snap}>
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={{ width: 64 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrap: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Palette.border },
  preview: { width: '100%', height: 200, backgroundColor: Palette.surfaceAlt },
  retake: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000000aa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  retakeText: { color: Palette.text, fontWeight: '700' },
  camWrap: { flex: 1, backgroundColor: '#000' },
  camControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xl,
  },
  cancel: { width: 64 },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
});
