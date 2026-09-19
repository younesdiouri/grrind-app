import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';

// Composition originale synthétique : aucune banque audio ni mélodie empruntée.
const rate = 22050;
function wave(name, seconds, sample) {
  const count = Math.floor(seconds * rate);
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) buffer.writeInt16LE(Math.round(sample(i / rate) * 16000), 44 + i * 2);
  writeFileSync(`assets/audio/alam/${name}.wav`, buffer);
}
mkdirSync('assets/audio/alam', { recursive: true });
const notes = [146.83, 220, 174.61, 261.63, 146.83, 196, 164.81, 220];
wave('ambience', 8, (t) => {
  const beat = Math.floor(t * 4);
  const envelope = Math.max(0, 1 - (t * 4 - beat)) * 0.2;
  return Math.sign(Math.sin(t * notes[beat % notes.length] * Math.PI * 2)) * envelope;
});
wave('impact', 0.18, (t) => Math.sign(Math.sin(t * (240 - t * 1000) * Math.PI * 2)) * (1 - t / 0.18) * 0.3);
wave('drop', 0.45, (t) => Math.sign(Math.sin(t * (440 + Math.floor(t * 8) * 220) * Math.PI * 2)) * (1 - t / 0.45) * 0.2);
