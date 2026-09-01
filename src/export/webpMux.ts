// Hand-rolled animated-WebP (RIFF/VP8X/ANIM/ANMF) muxer. Nothing in the
// browser or in Skia produces a multi-frame animated WebP — only
// single-frame WebP encoding exists (canvas.toDataURL('image/webp')) — so
// per-frame WebP images have to be stitched into one animated container
// ourselves. Flag byte values (VP8X: alpha=0x10, animation=0x02; ANMF:
// no-blend=bit1, dispose-none=bit0) match libwebp's mux_types.h constants.
//
// IMPORTANT: every concatenation here builds arrays of Uint8Array segments
// and copies them in one pass via concatBytes — never spreads raw byte
// arrays into a function call (`fn(...bytes)`/`arr.push(...bytes)`), since a
// single compressed frame can be tens of KB and spreading that many
// arguments into a call risks exceeding the engine's argument-count limit.

function fourCC(s: string): Uint8Array {
  return new Uint8Array([s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3)]);
}
function u32le(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
}
function u24le(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff]);
}
function u16le(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// A single-frame WebP file (from canvas.toDataURL('image/webp')) is its own
// `RIFF <size> WEBP <chunks...>` document, and browsers embed more than
// just image data in it — an ICCP color-profile chunk showed up here in
// testing, alongside the expected VP8X. An ANMF sub-frame must contain
// *only* the image-data chunk(s) (ALPH+'VP8 ', or VP8L) — every other
// chunk is a canvas-level/metadata concept, not a per-frame one, and
// including any of them breaks decoding — so this allowlists just the
// image-data tags instead of trying to denylist every metadata chunk a
// given browser's encoder might add.
const IMAGE_DATA_TAGS = new Set(['ALPH', 'VP8 ', 'VP8L']);

function extractFrameChunks(webpBytes: Uint8Array): Uint8Array {
  const view = new DataView(webpBytes.buffer, webpBytes.byteOffset, webpBytes.byteLength);
  let offset = 12; // past 'RIFF' <size> 'WEBP'
  const parts: Uint8Array[] = [];
  while (offset + 8 <= webpBytes.length) {
    const tag = String.fromCharCode(webpBytes[offset], webpBytes[offset + 1], webpBytes[offset + 2], webpBytes[offset + 3]);
    const size = view.getUint32(offset + 4, true);
    const total = 8 + size + (size % 2); // chunk header + payload + even-padding
    if (IMAGE_DATA_TAGS.has(tag)) parts.push(webpBytes.subarray(offset, offset + total));
    offset += total;
  }
  return concatBytes(parts);
}

export function muxAnimatedWebp(
  frames: { data: Uint8Array; durationMs: number }[],
  canvasWidth: number,
  canvasHeight: number,
  opts: { loopCount?: number } = {}
): Uint8Array {
  if (frames.length === 0) throw new Error('muxAnimatedWebp: no frames');

  const vp8xPayload = concatBytes([
    new Uint8Array([0x12, 0, 0, 0]), // flags: alpha(0x10) | animation(0x02); 3 reserved bytes
    u24le(canvasWidth - 1),
    u24le(canvasHeight - 1),
  ]);
  const vp8xChunk = concatBytes([fourCC('VP8X'), u32le(vp8xPayload.length), vp8xPayload]);

  const animPayload = concatBytes([
    new Uint8Array([0, 0, 0, 0]), // background color (BGRA), transparent black — never actually shown since every frame fully overwrites the canvas
    u16le(opts.loopCount ?? 0),
  ]);
  const animChunk = concatBytes([fourCC('ANIM'), u32le(animPayload.length), animPayload]);

  const anmfChunks = frames.map(({ data, durationMs }) => {
    const inner = extractFrameChunks(data);
    const pad = inner.length % 2 === 1 ? new Uint8Array(1) : new Uint8Array(0);
    const fixedFields = concatBytes([
      u24le(0), // Frame X (2px units) — always 0, frames are full-canvas
      u24le(0), // Frame Y
      u24le(canvasWidth - 1),
      u24le(canvasHeight - 1),
      u24le(Math.max(0, Math.round(durationMs))),
      new Uint8Array([0x02]), // no-blend (bit1), dispose-none (bit0) — moot since frames fully overwrite
    ]);
    const payload = concatBytes([fixedFields, inner, pad]);
    return concatBytes([fourCC('ANMF'), u32le(payload.length), payload]);
  });

  const body = concatBytes([vp8xChunk, animChunk, ...anmfChunks]);
  const riffPayload = concatBytes([fourCC('WEBP'), body]);
  return concatBytes([fourCC('RIFF'), u32le(riffPayload.length), riffPayload]);
}
