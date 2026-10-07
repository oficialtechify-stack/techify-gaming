import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'public/office-world');
const MAPS = ['city.tmj', 'office.tmj'];
const ALLOWED_WEBSITE_TRIGGERS = new Set(['onaction', 'onicon']);

function fail(errors, file, message) {
  errors.push(file + ': ' + message);
}

function flattenLayers(layers, out = []) {
  for (const layer of layers || []) {
    out.push(layer);
    if (Array.isArray(layer.layers)) flattenLayers(layer.layers, out);
  }
  return out;
}

const errors = [];
const warnings = [];

for (const file of MAPS) {
  const fullPath = path.join(ROOT, file);
  const map = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const layers = flattenLayers(map.layers);

  if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width <= 0 || map.height <= 0) {
    fail(errors, file, 'invalid map dimensions');
  }

  if (!layers.some((layer) => layer.type === 'objectgroup' && layer.name === 'floorLayer')) {
    fail(errors, file, 'missing object layer named floorLayer');
  }

  for (const layer of layers) {
    if (layer.type === 'tilelayer' && Array.isArray(layer.data)) {
      const width = layer.width ?? map.width;
      const height = layer.height ?? map.height;
      if (layer.data.length !== width * height) {
        fail(errors, file, 'tile layer "' + layer.name + '" has invalid data length');
      }
    }

    for (const object of layer.objects || []) {
      const isArea = object.class === 'area' || object.type === 'area';
      if (isArea && object.class !== 'area') {
        fail(errors, file, 'area "' + (object.name || object.id) + '" must use class="area"');
      }

      for (const property of object.properties || []) {
        if (
          property.name === 'openWebsiteTrigger' &&
          typeof property.value === 'string' &&
          !ALLOWED_WEBSITE_TRIGGERS.has(property.value)
        ) {
          fail(errors, file, 'invalid openWebsiteTrigger "' + property.value + '" on "' + (object.name || object.id) + '"');
        }
      }
    }
  }

  for (const tileset of map.tilesets || []) {
    if (typeof tileset.image === 'string' && /^https?:\/\//i.test(tileset.image)) {
      fail(errors, file, 'tileset image must use a LeadsPay-local path, not an external URL: ' + tileset.image);
    }
  }

  const collisionLayer = layers.find((layer) => layer.type === 'tilelayer' && layer.name === 'collisions');
  if (collisionLayer && collisionLayer.visible === false) {
    fail(errors, file, 'collision layer cannot be hidden; use opacity 0 instead so WorkAdventure still processes collisions');
  }

  if (map.tilewidth !== 32 || map.tileheight !== 32) {
    warnings.push(file + ': tile size is ' + map.tilewidth + 'x' + map.tileheight + '; WorkAdventure recommends 32x32.');
  }
}

if (warnings.length) {
  console.warn('[office-world] warnings:\n- ' + warnings.join('\n- '));
}

if (errors.length) {
  console.error('[office-world] validation failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log('[office-world] maps validated successfully.');
