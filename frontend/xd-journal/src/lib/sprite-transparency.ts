type PixelBuffer = Uint8ClampedArray | Uint8Array;

function isBackgroundPixel(data: PixelBuffer, pixelIndex: number, loose: boolean) {
  const offset = pixelIndex * 4;
  const alpha = data[offset + 3];
  if (alpha < 18) return true;

  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  if (max - min < 18 && (min > 226 || (min > 86 && max < 236))) return true;

  // Loose mode follows near-white anti-alias channels (low saturation, bright)
  // from the true edge into hair gaps and around ears. The character body stays
  // because skin/clothing are saturated or dark and break the channel.
  if (loose && max - min < 36 && min > 200) return true;

  return false;
}

function isNearWhitePocketPixel(data: PixelBuffer, pixelIndex: number) {
  const offset = pixelIndex * 4;
  if (data[offset + 3] < 18) return false;

  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return max - min < 40 && min > 205;
}

function isInteriorWhiteHole(data: PixelBuffer, pixelIndex: number) {
  const offset = pixelIndex * 4;
  if (data[offset + 3] < 18) return false;

  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return max - min < 10 && min > 245;
}

function clearPixel(data: PixelBuffer, offset: number) {
  data[offset] = 0;
  data[offset + 1] = 0;
  data[offset + 2] = 0;
  data[offset + 3] = 0;
}

function floodFillBackground(data: PixelBuffer, width: number, height: number, loose: boolean) {
  const totalPixels = width * height;
  const background = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const enqueueBackground = (x: number, y: number) => {
    const index = y * width + x;
    if (background[index] || !isBackgroundPixel(data, index, loose)) return;
    background[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueueBackground(x, 0);
    enqueueBackground(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueueBackground(0, y);
    enqueueBackground(width - 1, y);
  }

  while (head < tail) {
    const current = queue[head];
    head += 1;
    const x = current % width;
    const y = Math.floor(current / width);
    if (x > 0) enqueueBackground(x - 1, y);
    if (x < width - 1) enqueueBackground(x + 1, y);
    if (y > 0) enqueueBackground(x, y - 1);
    if (y < height - 1) enqueueBackground(x, y + 1);
  }

  for (let index = 0; index < totalPixels; index += 1) {
    if (background[index]) clearPixel(data, index * 4);
  }

  return background;
}

function removeInteriorWhiteHoles(data: PixelBuffer, width: number, height: number) {
  const totalPixels = width * height;

  for (let index = 0; index < totalPixels; index += 1) {
    if (isInteriorWhiteHole(data, index)) clearPixel(data, index * 4);
  }
}

// Removes only tiny enclosed near-white pockets (isolated anti-alias speckles
// trapped inside dark hair). Larger near-white regions like the shirt collar are
// preserved because their connected area is far above the threshold.
function removeTinyEnclosedPockets(
  data: PixelBuffer,
  width: number,
  height: number,
  background: Uint8Array,
  maxPocketArea = 12,
) {
  const totalPixels = width * height;
  const seen = new Uint8Array(totalPixels);
  const stack: number[] = [];

  for (let start = 0; start < totalPixels; start += 1) {
    if (seen[start] || background[start] || !isNearWhitePocketPixel(data, start)) continue;

    const component: number[] = [];
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;

    while (stack.length > 0) {
      const current = stack.pop() as number;
      component.push(current);
      const x = current % width;
      const y = Math.floor(current / width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || seen[neighbor] || background[neighbor]) continue;
        if (!isNearWhitePocketPixel(data, neighbor)) continue;
        seen[neighbor] = 1;
        stack.push(neighbor);
      }
    }

    if (component.length <= maxPocketArea) {
      for (const index of component) clearPixel(data, index * 4);
    }
  }
}

export type SpriteTransparencyProfile = {
  looseBackground?: boolean;
  tinyPocketCleanup?: boolean;
};

export const DEV_SPRITE_PROFILE: SpriteTransparencyProfile = {
  looseBackground: true,
  tinyPocketCleanup: true,
};

export function processSpriteImageData(
  data: PixelBuffer,
  width: number,
  height: number,
  profile: SpriteTransparencyProfile = {},
) {
  const background = floodFillBackground(data, width, height, profile.looseBackground ?? false);

  if (profile.tinyPocketCleanup) {
    removeTinyEnclosedPockets(data, width, height, background);
  } else {
    removeInteriorWhiteHoles(data, width, height);
  }
}

export function loadSpriteSource(
  image: HTMLImageElement,
  profile: SpriteTransparencyProfile = {},
): HTMLCanvasElement {
  return makeTransparentSprite(image, profile);
}

export function makeTransparentSprite(
  image: HTMLImageElement,
  profile: SpriteTransparencyProfile = {},
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  processSpriteImageData(imageData.data, canvas.width, canvas.height, profile);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
