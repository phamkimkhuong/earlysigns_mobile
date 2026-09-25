function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i += 1) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function floatTo16BitPCM(view: DataView, offset: number, input: ArrayLike<number>): void {
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
}

export function float32ToWavBytes(samples: Float32Array | number[], sampleRate: number = 16000): Uint8Array {
  const monoSamples = samples instanceof Float32Array ? samples : new Float32Array(samples || []);
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + monoSamples.length * bytesPerSample);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + monoSamples.length * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, monoSamples.length * bytesPerSample, true);
  floatTo16BitPCM(view, 44, monoSamples);
  return new Uint8Array(buffer);
}

export function pcm16ToWavBytes(
  pcmBytes: Uint8Array,
  sampleRate: number = 16000,
  numChannels: number = 1
): Uint8Array {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + pcmBytes.byteLength);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmBytes.byteLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // 16 bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, pcmBytes.byteLength, true);
  new Uint8Array(buffer, 44).set(pcmBytes);
  return new Uint8Array(buffer);
}

export function uint8ToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i + 1 < bytes.length ? chars[(triplet >> 6) & 63] : "=";
    result += i + 2 < bytes.length ? chars[triplet & 63] : "=";
  }
  return result;
}
