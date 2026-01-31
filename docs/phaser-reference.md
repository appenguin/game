# Phaser 3 API Reference (local)

Compiled from [docs.phaser.io](https://docs.phaser.io). Covers the APIs and concepts used or likely to be used in this project.

---

## Table of Contents

1. [Game Configuration](#game-configuration)
2. [Scenes](#scenes)
3. [Game Objects](#game-objects)
4. [Image](#image)
5. [Sprite](#sprite)
6. [Shape](#shape)
7. [Text](#text)
8. [Graphics](#graphics)
9. [Container](#container)
10. [Groups](#groups)
11. [Particles](#particles)
12. [Textures & Frames](#textures--frames)
13. [Animations](#animations)
14. [Tweens](#tweens)
15. [Camera](#camera)
16. [Input](#input)
17. [Asset Loader](#asset-loader)
18. [Scale Manager](#scale-manager)
19. [Time & Timers](#time--timers)
20. [Events](#events)
21. [Arcade Physics](#arcade-physics)
22. [Type Hierarchy](#type-hierarchy)

---

## Game Configuration

```js
const config = {
  type: Phaser.AUTO,          // AUTO | WEBGL | CANVAS
  width: 800,                 // canvas width px (same as scale.width)
  height: 600,                // canvas height px (same as scale.height)
  parent: 'game-container',   // DOM element ID or reference
  backgroundColor: '#000000', // hex color
  transparent: false,         // transparent canvas background
  antialias: true,            // WebGL linear interpolation (false = nearest-neighbor, crisper)
  autoRound: false,           // round display/style sizes (helps low-power devices)
  autoFocus: true,            // auto-focus window on mousedown
  scene: [BootScene, RunScene], // Scene class(es) or config objects
  scale: {
    mode: Phaser.Scale.FIT,   // NONE | FIT | ENVELOP | RESIZE | EXPAND
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
    width: 800,
    height: 600,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false },
  },
  input: {
    activePointers: 2,        // max simultaneous touch pointers
    smoothFactor: 0,           // pointer position interpolation
    gamepad: false,            // enable gamepad support
  },
  fps: { target: 60, forceSetTimeOut: false },
  render: { pixelArt: false, roundPixels: false },
  callbacks: {
    preBoot: (game) => {},     // after DOMContentLoaded, before systems init
    postBoot: (game) => {},    // after all systems ready
  },
  loader: { baseURL: '', path: '', maxParallelDownloads: 4 },
};
```

---

## Scenes

### Lifecycle

```
init(data) → preload() → create(data) → update(time, delta)
```

- **init(data)**: receives data from `scene.start('Key', data)`. Reset state here, not in constructor.
- **preload()**: queue assets via `this.load.*`. Loading starts automatically after return. `update()` is skipped until loading finishes.
- **create(data)**: create game objects. Assets from preload are available.
- **update(time, delta)**: runs every tick while scene is RUNNING. `time` = browser timestamp ms; `delta` = ms since last frame.

### Scene States

`PENDING → INIT → START → LOADING → CREATING → RUNNING`

From RUNNING: `PAUSED` (renders, no update), `SLEEPING` (hidden, preserved), `SHUTDOWN` (destroyed)

### Scene Management

```js
this.scene.start('Target', data);    // stop current, start target
this.scene.switch('Target');          // sleep current, start/wake target
this.scene.launch('Target', data);   // start target without affecting caller
this.scene.run('Target');             // resume/wake/restart as needed
this.scene.pause() / resume();
this.scene.sleep() / wake();
this.scene.stop() / restart();
this.scene.remove();                  // permanent destroy
```

### Data Passing

```js
// Via registry (global, persists across scenes)
this.registry.set('playerScore', 100);
this.registry.get('playerScore');

// Via scene start/restart
this.scene.start('NextScene', { level: 2 });
// → received in init(data) and create(data)
```

### Cleanup

```js
this.events.once('shutdown', () => { /* clear arrays, refs */ });
```

All scene objects auto-destroy on scene stop.

---

## Game Objects

All extend `Phaser.GameObjects.GameObject`. Common creation patterns:

```js
// Factory (auto-added to scene)
const img = this.add.image(x, y, 'key');
const spr = this.add.sprite(x, y, 'key', frame);

// Make (flexible)
const img = this.make.image({ x, y, key: 'key', add: true });

// Direct (manual add)
const spr = new Phaser.GameObjects.Sprite(this, x, y, 'key');
this.add.existing(spr);
```

### Common Properties (most game objects)

| Property | Description |
|----------|-------------|
| `x`, `y` | Position (world coords, or local if in Container) |
| `angle` / `rotation` | Degrees (-180 to 180) / radians (-PI to PI) |
| `scaleX`, `scaleY` | Scale multipliers |
| `displayWidth`, `displayHeight` | Scaled dimensions |
| `originX`, `originY` | Pivot point (0-1). Default 0.5 for most objects |
| `alpha` | Transparency (0-1) |
| `depth` | Render order (higher = on top) |
| `visible` | Whether to render |
| `active` | Whether to update |
| `flipX`, `flipY` | Mirror rendering |
| `scrollFactor` | Parallax (0 = fixed to screen, 1 = moves with camera) |
| `name` | Developer string, not used internally |
| `state` | Developer string/number, not used internally |

### Common Methods

```js
obj.setPosition(x, y);
obj.setScale(sx, sy);
obj.setDisplaySize(w, h);
obj.setOrigin(ox, oy);
obj.setDepth(d);
obj.setAlpha(a);                      // WebGL supports per-corner: setAlpha(tl, tr, bl, br)
obj.setVisible(bool);
obj.setActive(bool);
obj.setScrollFactor(x, y);
obj.setRotation(radians);
obj.setAngle(degrees);
obj.setFlip(flipX, flipY);
obj.setTint(color);                   // multiplicative tint (WebGL)
obj.setTintFill(color);               // opaque fill tint
obj.clearTint();
obj.setData('key', value);
obj.getData('key');
obj.setInteractive();                 // enable input
obj.disableInteractive();
obj.removeInteractive();
obj.destroy();
```

### Visibility Issues Checklist

Object won't display if: outside camera viewport, behind other objects, using blank texture, not on display list, `visible === false`, `alpha === 0`, scale is 0, masked, or already destroyed.

---

## Image

Light-weight static image display. No animation support.

```js
// Load
this.load.image('logo', 'logo.png');

// Create
const img = this.add.image(x, y, 'logo');
const img = this.add.image(x, y, 'atlas', 'frameName');

// Make with config
const img = this.make.image({ x, y, key: 'logo', add: true });
```

Components: Alpha, BlendMode, Depth, Flip, GetBounds, Mask, Origin, Pipeline, PostPipeline, ScrollFactor, Size, TextureCrop, Tint, Transform, Visible.

Supports: input events, physics bodies, tweening, tinting, scrolling, masking, pre/post FX.

**Use Image over Sprite when you don't need animation** — lighter processing overhead.

---

## Sprite

Same as Image but with Animation support. Slightly heavier.

```js
// Load
this.load.spritesheet('mummy', 'mummy.png', { frameWidth: 37, frameHeight: 45 });
this.load.atlas('player', 'player.png', 'player.json');

// Create
const spr = this.add.sprite(x, y, 'mummy');
const spr = this.add.sprite(x, y, 'player', 'idle_01');
```

Has `preUpdate(time, delta)` method — added to Update List automatically.

### Custom Sprite Class

```js
class Enemy extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
  }
  preUpdate(time, delta) {
    super.preUpdate(time, delta); // must call super for animations
  }
}
```

### Animation on Sprites

```js
spr.play('walk');
spr.playReverse('walk');
spr.playAfterDelay('walk', 500);
spr.chain('idle');                // queue after current finishes
spr.stop();
spr.anims.restart();
spr.anims.isPlaying;              // boolean
spr.anims.getName();
spr.anims.getFrameName();
```

---

## Shape

Base class for geometric shapes (Arc, Circle, Curve, Ellipse, Grid, IsoBox, IsoTriangle, Line, Polygon, Rectangle, Star, Triangle). Cannot be instantiated directly.

```js
const rect = this.add.rectangle(x, y, w, h, fillColor, fillAlpha);
const circle = this.add.circle(x, y, radius, fillColor, fillAlpha);
const tri = this.add.triangle(x, y, x1, y1, x2, y2, x3, y3, fillColor, fillAlpha);
const ellipse = this.add.ellipse(x, y, w, h, fillColor, fillAlpha);
```

### Shape-specific Properties

```js
shape.fillColor;
shape.fillAlpha;
shape.isFilled;
shape.strokeColor;
shape.strokeAlpha;
shape.lineWidth;
shape.isStroked;
shape.setFillStyle(color, alpha);
shape.setStrokeStyle(lineWidth, color, alpha);
```

Components: AlphaSingle, BlendMode, Depth, GetBounds, Mask, Origin, Pipeline, PostPipeline, ScrollFactor, Transform, Visible.

**Note:** Shape does NOT have the Tint component. Image/Sprite do.

---

## Text

Renders text via hidden Canvas, converts to texture. Performance-heavy on frequent updates.

```js
const txt = this.add.text(x, y, 'Hello', {
  fontFamily: 'Arial',
  fontSize: '32px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 4,
  align: 'center',             // 'left' | 'center' | 'right' | 'justify'
  backgroundColor: '#333333',
  wordWrap: { width: 300 },
  padding: { left: 10, right: 10, top: 5, bottom: 5 },
  maxLines: 3,
  lineSpacing: 5,
  fixedWidth: 200,
  fixedHeight: 100,
  shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, fill: true },
});
```

### Text Methods

```js
txt.setText('new text');
txt.appendText('more', addCR);   // addCR: boolean (default true = newline)
txt.text;                          // get current text
txt.setStyle(styleObj);
txt.setColor(color);
txt.setFont(font);
txt.setFontSize(size);
txt.setStroke(color, thickness);
txt.setBackgroundColor(color);
txt.setShadow(x, y, color, blur, shadowStroke, shadowFill);
txt.setWordWrapWidth(width, useAdvanced);
txt.setAlign(align);
txt.setLineSpacing(value);
txt.setLetterSpacing(value);       // perf warning: renders per-character
txt.setMaxLines(max);
txt.setFixedSize(w, h);
txt.setPadding(left, top, right, bottom);
```

**Default origin:** (0, 0) — top-left, unlike most game objects (0.5, 0.5).

**Performance tip:** Every text/style change re-renders the hidden Canvas and re-uploads to GPU. Use BitmapText for frequently changing text.

---

## Graphics

Draw primitive shapes. Useful for generating textures.

```js
const g = this.add.graphics();

// Styles
g.fillStyle(0xff0000, 1.0);
g.lineStyle(2, 0x00ff00, 1.0);
g.fillGradientStyle(topLeft, topRight, bottomLeft, bottomRight, alpha); // WebGL only

// Direct shapes
g.fillRect(x, y, w, h);
g.strokeRect(x, y, w, h);
g.fillRoundedRect(x, y, w, h, radius);
g.fillCircle(x, y, radius);
g.strokeCircle(x, y, radius);
g.fillEllipse(x, y, w, h);
g.fillTriangle(x1, y1, x2, y2, x3, y3);
g.fillPoint(x, y, size);
g.lineBetween(x1, y1, x2, y2);

// Path-based
g.beginPath();
g.moveTo(x, y);
g.lineTo(x, y);
g.arc(x, y, radius, startAngle, endAngle, anticlockwise);
g.closePath();
g.strokePath();
g.fillPath();

// Generate texture from drawn content
g.generateTexture('myTexture', width, height);

// Clear
g.clear();

// Canvas transforms
g.save(); g.restore();
g.translateCanvas(x, y);
g.scaleCanvas(x, y);
g.rotateCanvas(radians);

// Masking
g.createGeometryMask();
```

**Performance:** Graphics decompose into polygons in WebGL — expensive with complex shapes. Use `generateTexture()` to bake into a texture if the graphic doesn't change.

---

## Container

Groups game objects with shared transform.

```js
const container = this.add.container(x, y);
const container = this.add.container(x, y, [child1, child2]);

// Children
container.add(child);
container.addAt(child, index);
container.remove(child, destroy);
container.removeAll(destroy);

// Query
container.getByName(name);
container.getFirst(property, value);
container.getAll(property, value);
container.exists(child);
container.first / last / next / previous;

// Ordering
container.bringToTop(child);
container.sendToBack(child);
container.moveUp(child) / moveDown(child);
container.swap(child1, child2);

// Batch set
container.setAll(property, value);
container.each(callback, context);
container.iterate(callback, context);
```

**Key behaviors:**
- Children positions become relative to container origin (0, 0)
- Container transform (x, y, rotation, scale) affects all children
- `child.getWorldTransformMatrix()` for world coords
- Containers can nest (but nested containers add performance overhead)
- Children can only belong to one container (exclusive by default)
- `container.setExclusive(false)` allows multi-container membership
- `container.setSize(w, h)` — default is 0; needed for input hit areas
- `container.setScrollFactor(x, y)` applies to all children

**Performance warning:** Containers add processing overhead per child. Deep nesting compounds the cost.

---

## Groups

Manage collections of game objects. Great for object pooling.

```js
const group = this.add.group({
  classType: Phaser.GameObjects.Image,  // default creation class
  defaultKey: 'bullet',
  defaultFrame: 0,
  maxSize: 50,                          // pool limit
  runChildUpdate: true,                 // call child.update() each tick
  createCallback: (obj) => {},
  removeCallback: (obj) => {},
});

// Add/remove
group.add(obj);
group.addMultiple([obj1, obj2]);
group.remove(obj, removeFromScene, destroy);
group.clear(removeFromScene, destroy);

// Query
group.getChildren();
group.getMatching(property, value);
group.contains(child);
group.getLength();

// Object pooling
group.get(x, y, key, frame);           // get inactive or create
group.getFirst(active, createIfMissing, x, y, key, frame);
group.getFirstAlive();
group.getFirstDead();
group.getTotalUsed();                   // active count
group.getTotalFree();                   // maxSize - used

// Batch create
group.createMultiple({ key: 'bullet', repeat: 9, setXY: { x: 100, stepX: 50 } });
```

Objects auto-remove from group when destroyed.

---

## Particles

```js
const emitter = this.add.particles(x, y, 'texture', config);
```

Since v3.60+, `add.particles()` returns a `ParticleEmitter` directly (no ParticleEmitterManager).

### Config Value Formats

```js
// Static
{ speed: 200 }

// Random range
{ speed: { min: 100, max: 300 } }
// or
{ speed: { random: [100, 300] } }

// Random from array
{ frame: [0, 1, 2, 3] }

// Start → end (eased over lifetime)
{ scale: { start: 1, end: 0 } }
{ scale: { start: 1, end: 0, ease: 'bounce.out' } }
{ scale: { start: 1, end: 0, random: true } }   // random start between start-end

// Interpolated path
{ x: { values: [50, 500, 200, 800], interpolation: 'catmull' } }

// Stepped
{ x: { steps: 32, start: 0, end: 576 } }
{ x: { steps: 32, start: 0, end: 576, yoyo: true } }

// Callbacks
{ speed: (particle, key, t, value) => { return computedValue; } }
{ x: { onEmit: (p, k, t, v) => v, onUpdate: (p, k, t, v) => v } }
```

### Core Config Properties

| Property | Description |
|----------|-------------|
| `emitting` | Auto-emit when true (default true) |
| `frequency` | ms between emission cycles. 0 = max rate. -1 = explosion mode |
| `quantity` | Particles per cycle |
| `lifespan` | Particle lifetime in ms |
| `duration` | Max emission time in ms (0 = unlimited) |
| `maxParticles` | Hard limit (0 = unlimited) |
| `maxAliveParticles` | Max simultaneous alive particles |
| `advance` | Fast-forward emitter by ms |
| `timeScale` | Speed multiplier |
| `blendMode` | Blend mode |
| `reserve` | Pre-allocate dead particles |
| `particleBringToTop` | New particles render above existing |

### Per-Particle Properties

| Property | Description |
|----------|-------------|
| `particleX`, `particleY` | Offset from emitter position |
| `speed` / `speedX`, `speedY` | Movement speed |
| `accelerationX`, `accelerationY` | Acceleration |
| `gravityX`, `gravityY` | Gravity |
| `bounce` | Bounce factor |
| `maxVelocityX`, `maxVelocityY` | Speed caps |
| `scaleX`, `scaleY` / `scale` | Particle scale |
| `alpha` | Particle alpha |
| `tint` | Particle tint |
| `angle` | Emission angle (degrees) |
| `particleRotate` | Initial rotation (degrees) |
| `lifespan` | Per-particle lifetime |
| `delay` | Startup delay |
| `hold` | Post-death freeze duration |
| `moveToX`, `moveToY` | Target coordinates |

### Control Methods

```js
emitter.start(advance, duration);
emitter.stop(kill);                      // kill: true = remove all active particles
emitter.pause() / resume();
emitter.flow(frequency, count, stopAfter);
emitter.explode(count, x, y);
emitter.emitParticle(count, x, y);       // manual burst
emitter.emitParticleAt(x, y, count);
emitter.killAll();
emitter.fastForward(time, delta);
emitter.getAliveParticleCount();
emitter.getDeadParticleCount();
emitter.atLimit();
```

### Emit Zones

```js
// Random zone — particles spawn randomly within geometry
emitter.addEmitZone({ type: 'random', source: new Phaser.Geom.Circle(0, 0, 50) });

// Edge zone — particles spawn along edges
emitter.addEmitZone({ type: 'edge', source: curve, quantity: 32, yoyo: true });

emitter.setEmitZone(zone);
emitter.removeEmitZone(zone);
emitter.clearEmitZones();
```

### Death Zones

```js
emitter.addDeathZone({ type: 'onEnter', source: new Phaser.Geom.Rect(0, 0, 100, 100) });
emitter.addDeathZone({ type: 'onLeave', source: geometry });
```

### Follow Target

```js
emitter.startFollow(gameObject, offsetX, offsetY, trackVisible);
emitter.stopFollow();
```

### Texture Frames

```js
emitter.setEmitterFrame(frames, pickRandom, quantity);
emitter.setAnim(anims, pickRandom, quantity);
```

### Sorting

```js
emitter.setSortProperty('y', true);    // ascending
emitter.setSortCallback(compareFn);
```

### Gravity Wells

```js
emitter.createGravityWell({ x: 200, y: 200, power: 1, epsilon: 100, gravity: 50 });
```

### Events

`'start'`, `'explode'`, `'deathzone'`, `'stop'`, `'complete'`

### Callbacks

```js
emitter.onParticleEmit(callback, context);
emitter.onParticleDeath(callback, context);
```

---

## Textures & Frames

### Loading

```js
this.load.image('key', 'url.png');
this.load.spritesheet('key', 'url.png', { frameWidth: 32, frameHeight: 32, startFrame: 0, endFrame: -1, margin: 0, spacing: 0 });
this.load.atlas('key', 'texture.png', 'atlas.json');
this.load.multiatlas('key', 'atlas.json', 'path/');
```

### Texture Manager

```js
this.textures.exists('key');             // check existence
this.textures.get('key');                // get texture (returns __MISSING if not found)
this.textures.getTextureKeys();          // all registered keys
this.textures.getBase64('key');          // export as base64
this.textures.remove('key');             // delete texture
this.textures.getPixel(x, y, 'key');    // get pixel color { r, g, b, a }
this.textures.getPixelAlpha(x, y, 'key');
```

### Built-in Textures

- `__DEFAULT`: 32x32 transparent
- `__MISSING`: 32x32 green slashed box
- `__WHITE`: 4x4 white

### Frames

```js
const frame = this.textures.getFrame('key', 'frameName');
const names = this.textures.get('key').getFrameNames();
const frame = this.textures.get('key').get(0);   // by index

// Frame properties
frame.realWidth;
frame.realHeight;
frame.cutX; frame.cutY; frame.cutWidth; frame.cutHeight;
frame.customPivot = true;
frame.pivotX = 0.5;
frame.pivotY = 1;
```

### Dynamic Textures

```js
const tex = this.textures.addDynamicTexture('key', width, height);
tex.draw(entries, x, y, alpha, tint);          // sprites, images, graphics, etc.
tex.stamp('key', 'frame', x, y, { angle, scale, alpha });
tex.repeat('key', 'frame', x, y, width, height);
tex.erase(entries, x, y);
tex.fill(rgb, alpha, x, y, width, height);
tex.clear();

// Batch mode
tex.beginDraw();
tex.batchDraw(entries, x, y);
tex.batchDrawFrame('key', 'frame', x, y);
tex.endDraw();

// Internal camera
tex.camera.setScroll(x, y);
tex.camera.setZoom(zoom);
```

### Canvas Texture

```js
const tex = this.textures.createCanvas('key', width, height);
tex.drawFrame('key', 'frame', x, y);
tex.draw(sourceImage, x, y);
tex.setPixel(x, y, r, g, b, a);
tex.getPixel(x, y);
tex.clear();
tex.refresh();           // required after context manipulation in WebGL
tex.add('frameName', sourceIndex, x, y, w, h);  // add frame
```

### Filter Modes

```js
texture.setFilterMode(Phaser.Textures.FilterMode.NEAREST);  // pixel art
texture.setFilterMode(Phaser.Textures.FilterMode.LINEAR);   // smooth
```

### From Existing Elements

```js
this.textures.addImage('key', htmlImageElement);
this.textures.addSpriteSheet('key', htmlImageElement, { frameWidth, frameHeight });
this.textures.addAtlas('key', htmlImageElement, atlasData);
```

### Events

```js
this.textures.on('addtexture', (key) => {});
this.textures.on('addtexture-myKey', () => {});
this.textures.on('removetexture', (key) => {});
this.textures.on('onerror', (key) => {});
```

---

## Animations

### Creating

```js
// Global (shared by all sprites)
this.anims.create({
  key: 'walk',
  frames: this.anims.generateFrameNumbers('spritesheet', { start: 0, end: 7 }),
  // or: frames: this.anims.generateFrameNames('atlas', { prefix: 'walk_', start: 0, end: 7, zeroPad: 2 }),
  frameRate: 10,                // fps (default 24)
  // duration: 1000,            // alternative to frameRate
  repeat: -1,                   // -1 = infinite
  repeatDelay: 0,
  delay: 0,
  yoyo: false,
  timeScale: 1,
  showBeforeDelay: false,
  showOnStart: false,
  hideOnComplete: false,
  skipMissedFrames: true,
  randomFrame: false,
});

// Sprite-private
sprite.anims.create(config);

// From Aseprite
this.anims.createFromAseprite('key', tags);
sprite.anims.createFromAseprite('key', tags);
```

### Frame Generation Helpers

```js
this.anims.generateFrameNumbers('key', { start, end, first, frames });
this.anims.generateFrameNames('key', { prefix, suffix, start, end, zeroPad });
```

### Playback

```js
sprite.play('walk');
sprite.play({ key: 'walk', frameRate: 15 });  // override config
sprite.playReverse('walk');
sprite.playAfterDelay('walk', 500);
sprite.playAfterRepeat('walk', 2);
sprite.chain('idle');                  // queue next animation
sprite.stop();
sprite.stopAfterDelay(delay);
sprite.stopOnFrame(frame);
sprite.stopAfterRepeat(count);
sprite.anims.restart(includeDelay, resetRepeats);
```

### Animation Properties

```js
sprite.anims.isPlaying;
sprite.anims.isPaused;
sprite.anims.hasStarted;
sprite.anims.getName();
sprite.anims.getFrameName();
sprite.anims.getTotalFrames();
sprite.anims.currentAnim;
sprite.anims.currentFrame;
sprite.anims.delay;
sprite.anims.repeat;
sprite.anims.repeatCounter;
sprite.anims.yoyo;
sprite.anims.globalTimeScale;
```

### Mixing (Transitions)

```js
this.anims.addMix('walk', 'idle', 300);    // 300ms crossfade
this.anims.removeMix('walk', 'idle');
```

### Events

On sprite: `animationstart`, `animationrestart`, `animationcomplete`, `animationstop`, `animationupdate`, `animationrepeat`

Key-specific: `animationcomplete-walk`

On manager: `add`, `remove`, `pauseall`, `resumeall`

### Animation Management

```js
this.anims.get('walk');
this.anims.exists('walk');
this.anims.remove('walk');
this.anims.pauseAll();
this.anims.resumeAll();
this.anims.globalTimeScale = 0.5;
```

---

## Tweens

### Creating

```js
const tween = this.tweens.add({
  targets: gameObject,          // single object or array
  x: 400,                       // target value
  y: '+=100',                   // relative: +=, -=, *=, /=
  alpha: { from: 0, to: 1 },   // explicit from/to
  scale: 'random(0.5, 1.5)',   // random value
  rotation: [0, 1, 2, 0],      // array interpolation
  duration: 1000,               // ms
  delay: 0,                     // ms before start (supports stagger)
  hold: 0,                      // ms pause before yoyo
  repeat: 0,                    // -1 = infinite
  repeatDelay: 0,
  yoyo: false,
  loop: 0,                      // -1 = infinite
  loopDelay: 0,
  ease: 'Power2',               // easing function
  flipX: false,                 // flip on complete
  flipY: false,
  completeDelay: 0,
  // Per-property config:
  props: {
    x: { value: 400, duration: 2000, ease: 'Bounce' },
    y: { value: 300, duration: 1000, ease: 'Sine.easeInOut' },
  },
});
```

### Easing Functions

`Linear`, `Quad`, `Cubic`, `Quart`, `Quint`, `Sine`, `Expo`, `Circ`, `Elastic`, `Back`, `Bounce`

Each has `.easeIn`, `.easeOut`, `.easeInOut` variants. Also `Power0` through `Power4`.

Custom: `ease: (t) => t * t`

### Callbacks

```js
{
  onStart: (tween, targets) => {},
  onActive: (tween, targets) => {},
  onUpdate: (tween, targets, key, current, previous, param) => {},
  onYoyo: (tween, targets, key, current, previous, param) => {},
  onRepeat: (tween, targets, key) => {},
  onLoop: (tween) => {},
  onComplete: (tween, targets) => {},
  onStop: (tween, targets) => {},
}
```

### Control Methods

```js
tween.pause() / resume();
tween.play();
tween.restart();
tween.seek(timeMs);
tween.complete();              // finish + fire onComplete
tween.stop();                  // stop without onComplete
tween.remove();
tween.destroy();
tween.setTimeScale(value);
tween.isPlaying();
tween.isPaused();
tween.hasStarted;
tween.hasTarget(obj);
```

### Tween Chains

```js
const chain = this.tweens.chain({
  targets: gameObject,
  tweens: [
    { alpha: 1, duration: 500 },
    { x: 400, duration: 1000 },
    { y: 300, duration: 800, ease: 'Bounce' },
  ],
  loop: 0,
});
```

### Utility

```js
this.tweens.getTweensOf(target);    // get all tweens for target
this.tweens.getTweens();             // all tweens
this.tweens.killTweensOf(target);    // stop + destroy
this.tweens.addCounter({ from: 0, to: 100, duration: 1000, onUpdate: (t) => {} });
this.tweens.stagger(1000);           // delay helper for arrays
```

---

## Camera

### Access

```js
const cam = this.cameras.main;
const cam2 = this.cameras.add(x, y, width, height, makeMain, name);
```

### Scroll & Position

```js
cam.setScroll(x, y);
cam.scrollX; cam.scrollY;           // direct access
cam.centerOn(worldX, worldY);
cam.centerToBounds();
```

### Zoom & Rotation

```js
cam.setZoom(value);                  // <1 zoom out, >1 zoom in, min 0.001
cam.setRotation(radians);
cam.setAngle(degrees);
```

### Following

```js
cam.startFollow(target, roundPixels, lerpX, lerpY, offsetX, offsetY);
// lerp: 1 = instant snap, 0.1 = smooth tracking
cam.stopFollow();
cam.setDeadzone(width, height);      // area where target moves without scrolling
```

### Bounds

```js
cam.setBounds(x, y, width, height);
cam.getBounds();
cam.removeBounds();
cam.useBounds = false;               // temporarily disable
```

### Effects

```js
cam.shake(duration, intensity, force);
cam.flash(duration, r, g, b, force);
cam.fade(duration, r, g, b, force);
cam.pan(x, y, duration, ease, force);
cam.zoomTo(zoom, duration, ease, force);
cam.rotateTo(radians, shortestPath, duration, ease, force);

// Check effect state
cam.shakeEffect.isRunning;
cam.flashEffect.progress;
cam.fadeEffect.reset();
```

### Properties

```js
cam.worldView;                       // visible world area Rectangle
cam.midPoint;                        // center of world view
cam.width; cam.height;               // viewport size
cam.centerX; cam.centerY;            // viewport center
cam.setBackgroundColor(color);
cam.setAlpha(value);                 // affects all rendered objects
cam.ignore(gameObject);              // don't render specific object
cam.setVisible(bool);
cam.roundPixels = true;              // prevent sub-pixel aliasing
```

---

## Input

### Pointer / Mouse / Touch

```js
// On game objects
gameObject.setInteractive();
gameObject.on('pointerdown', (pointer, localX, localY, event) => {});
gameObject.on('pointerup', handler);
gameObject.on('pointermove', handler);
gameObject.on('pointerover', handler);
gameObject.on('pointerout', handler);

// On scene input
this.input.on('pointerdown', (pointer) => {});
this.input.on('gameobjectdown', (pointer, gameObject, event) => {});
this.input.on('wheel', (pointer, currentlyOver, dx, dy, dz, event) => {});
```

### Pointer Properties

```js
pointer.x; pointer.y;               // screen coords
pointer.worldX; pointer.worldY;     // world coords
pointer.isDown;
pointer.primaryDown;
pointer.leftButtonDown();
pointer.rightButtonDown();
pointer.middleButtonDown();
pointer.getDistance();                // from down to current
pointer.getAngle();
pointer.velocity;                    // Vector2
pointer.downX; pointer.downY;       // where pressed
pointer.upX; pointer.upY;           // where released
```

### Multi-touch

```js
// Game config: input: { activePointers: 2 }
// Or: this.input.addPointer(count);
this.input.pointer1;                 // through pointer10
this.input.manager.pointers[n];
this.input.activePointer;            // most recent
```

### Keyboard

```js
const key = this.input.keyboard.addKey('W');
const keys = this.input.keyboard.addKeys('W,S,A,D');
const keys = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
const cursors = this.input.keyboard.createCursorKeys(); // up, down, left, right, space, shift

key.isDown;
key.isUp;
key.getDuration();
key.enabled = false;

// Events
key.on('down', (event) => {});
key.on('up', (event) => {});
this.input.keyboard.on('keydown-W', (event) => {});
this.input.keyboard.on('keydown', (event) => {});

// Combos
const combo = this.input.keyboard.createCombo(['UP', 'UP', 'DOWN', 'DOWN'], {
  resetOnWrongKey: true, maxKeyDelay: 0, deleteOnMatch: false,
});
this.input.keyboard.on('keycombomatch', (combo, event) => {});

// Cleanup
this.input.keyboard.removeKey('W');
this.input.keyboard.removeAllKeys();
```

### Hit Areas

```js
// Auto (texture bounds)
gameObject.setInteractive();

// Custom shapes
gameObject.setInteractive(new Phaser.Geom.Circle(16, 16, 16), Phaser.Geom.Circle.Contains);
gameObject.setInteractive(new Phaser.Geom.Rectangle(0, 0, 50, 50), Phaser.Geom.Rectangle.Contains);

// Pixel-perfect
gameObject.setInteractive({ pixelPerfect: true, alphaTolerance: 128 });

// Batch set
this.input.setHitArea([obj1, obj2], shape, callback);
```

### Drag & Drop

```js
gameObject.setInteractive({ draggable: true });

gameObject.on('dragstart', (pointer, dragX, dragY) => {});
gameObject.on('drag', (pointer, dragX, dragY) => {});
gameObject.on('dragend', (pointer, dragX, dragY, dropped) => {});

// Drop zones
dropTarget.setInteractive({ dropZone: true });
gameObject.on('drop', (pointer, target) => {});
gameObject.on('dragenter', (pointer, target) => {});
gameObject.on('dragleave', (pointer, target) => {});

// Thresholds
this.input.dragDistanceThreshold = 16;
this.input.dragTimeThreshold = 500;
```

### Gamepad

```js
// Enable: input: { gamepad: true }
this.input.gamepad.on('connected', (pad) => {});
const pad = this.input.gamepad.getPad(0);
pad.leftStick.x; pad.leftStick.y;
pad.A; pad.B; pad.X; pad.Y;
pad.L1; pad.L2; pad.R1; pad.R2;
pad.left; pad.right; pad.up; pad.down;
```

### Input Settings

```js
this.input.topOnly = false;          // events from all overlapping objects
this.input.enabled = false;          // disable all input
this.input.setPollOnMove();          // default
this.input.setPollAlways();          // poll every frame
this.input.enableDebug(gameObject);  // visualize hit areas
```

---

## Asset Loader

### In preload()

```js
// Images
this.load.image('key', 'url.png');
this.load.image({ key: 'key', url: 'url.png' });

// Spritesheets
this.load.spritesheet('key', 'url.png', { frameWidth: 32, frameHeight: 32, startFrame: 0, endFrame: -1, margin: 0, spacing: 0 });

// Atlases
this.load.atlas('key', 'texture.png', 'atlas.json');
this.load.unityAtlas('key', 'texture.png', 'atlas.txt');
this.load.multiatlas('key', 'atlas.json', 'imagePath/');

// Audio
this.load.audio('key', ['url.ogg', 'url.mp3']);

// Data
this.load.json('key', 'url.json');
this.load.xml('key', 'url.xml');
this.load.text('key', 'url.txt');
this.load.binary('key', 'url.bin');
this.load.csv('key', 'url.csv');

// Tilemaps
this.load.tilemapTiledJSON('key', 'map.json');
this.load.tilemapCSV('key', 'map.csv');

// Bitmap fonts
this.load.bitmapFont('key', 'font.png', 'font.xml');

// Video
this.load.video('key', 'url.mp4', 'loadeddata');   // 'canplay' | 'canplaythrough'

// SVG (rasterized to texture)
this.load.svg('key', 'url.svg', { width, height });

// GLSL shaders
this.load.glsl('key', 'shader.glsl');

// Scripts
this.load.script('key', 'url.js');

// HTML textures
this.load.htmlTexture('key', 'url.html', width, height);

// File packs (JSON manifest)
this.load.pack('key', 'pack.json');

// Set base path
this.load.setPath('assets/');
this.load.setBaseURL('https://cdn.example.com/');
```

### Loading Events

```js
this.load.on('start', () => {});
this.load.on('progress', (value) => {});           // 0-1
this.load.on('fileprogress', (file, progress) => {});
this.load.on('filecomplete', (key, type, data) => {});
this.load.on('filecomplete-image-myKey', (key, type, data) => {});
this.load.on('loaderror', (file) => {});
this.load.on('complete', () => {});
```

### Manual Loading (outside preload)

```js
this.load.image('key', 'url.png');
this.load.once('complete', () => { /* use assets */ });
this.load.start();
```

### Cache Access

```js
this.textures;              // TextureManager (images, spritesheets, atlases)
this.cache.json;
this.cache.audio;
this.cache.binary;
this.cache.shader;
this.cache.xml;
this.cache.text;
```

---

## Scale Manager

### Scaling Modes

| Mode | Behavior |
|------|----------|
| `NONE` | No scaling |
| `FIT` | Fit inside parent, keep aspect ratio |
| `ENVELOP` | Cover parent, keep aspect ratio (may crop) |
| `RESIZE` | Match parent size, ignore aspect ratio |
| `EXPAND` | Resize to parent + fit scaling |
| `WIDTH_CONTROLS_HEIGHT` | Height adjusts to width |
| `HEIGHT_CONTROLS_WIDTH` | Width adjusts to height |

### Auto-Center

`NO_CENTER`, `CENTER_BOTH`, `CENTER_HORIZONTALLY`, `CENTER_VERTICALLY`

### Methods

```js
this.scale.resize(width, height);         // direct canvas resize
this.scale.setGameSize(width, height);    // change base size respecting mode
this.scale.updateBounds();                 // refresh after external DOM changes

// Fullscreen
this.scale.startFullscreen();
this.scale.stopFullscreen();
this.scale.toggleFullscreen();
this.scale.isFullscreen;

// Orientation
this.scale.lockOrientation('portrait');    // or 'landscape'
this.scale.isPortrait;
this.scale.isLandscape;

// Size info
this.scale.gameSize;           // original requested dimensions
this.scale.baseSize;           // auto-rounded canvas dimensions
this.scale.displaySize;        // CSS-styled canvas size
this.scale.parentSize;         // parent DOM element dimensions
this.scale.getViewPort();      // visible area Rectangle
```

### Events

`resize`, `orientationchange`, `enterfullscreen`, `leavefullscreen`, `fullscreenfailed`, `fullscreenunsupported`

---

## Time & Timers

### Timer Events

```js
// Looped timer
this.time.addEvent({ delay: 500, callback: fn, callbackScope: this, loop: true });

// Finite repeats
this.time.addEvent({ delay: 500, callback: fn, repeat: 4 });

// Simple delay
this.time.delayedCall(500, fn, args, scope);
```

### Timer Control

```js
timer.paused = true / false;
timer.remove();                       // or this.time.removeEvent(timer)
timer.timeScale = 0.5;
timer.getElapsed();
timer.getRemaining();
timer.getProgress();
timer.getOverallProgress();           // accounts for repeats
timer.getRepeatCount();
```

### Timeline

```js
const timeline = this.add.timeline([
  { at: 0, run: () => {} },
  { at: 500, tween: { targets: obj, x: 100 } },
  { at: 1000, sound: 'explosion' },
  { at: 1500, event: 'myEvent' },
  { from: 200, run: () => {} },       // relative to previous
  { in: 300, run: () => {} },         // relative to now
]);

timeline.play();
timeline.pause() / resume();
timeline.stop();
timeline.reset();
timeline.repeat(amount);
timeline.destroy();
```

---

## Events

### EventEmitter

All game objects extend EventEmitter. Scenes have `this.events`.

```js
// Listen
emitter.on('eventName', callback, scope);
emitter.once('eventName', callback, scope);   // auto-removes after first fire

// Emit
emitter.emit('eventName', arg1, arg2);

// Remove
emitter.off('eventName', callback, scope);    // specific listener
emitter.off('eventName');                      // all listeners for event
emitter.removeAllListeners();                  // all events

// Inspect
emitter.listenerCount('eventName');
emitter.listeners('eventName');
emitter.eventNames();
```

**Warning:** `off()` without specific callback/scope removes ALL listeners for that event — never remove listeners you don't own.

`on()` === `addListener()`; `off()` === `removeListener()`

### Scene Lifecycle Events

```js
this.events.on('create', () => {});
this.events.on('update', (time, delta) => {});
this.events.on('pause', () => {});
this.events.on('resume', () => {});
this.events.on('sleep', () => {});
this.events.on('wake', () => {});
this.events.on('shutdown', () => {});
this.events.on('destroy', () => {});
```

### Custom Emitter

```js
class MySystem extends Phaser.Events.EventEmitter {
  constructor() { super(); }
  doSomething() { this.emit('done', result); }
}
```

---

## Arcade Physics

### Enable

```js
// Game config
physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } }

// Per object
this.physics.add.existing(gameObject, bodyType);  // 0 = dynamic, 1 = static
this.physics.world.enable(gameObjects, bodyType);
```

### Body Properties

```js
body.setEnable(true);
body.setImmovable(true);             // won't move from collisions
body.pushable = true;                 // can be pushed
body.setDirectControl(true);          // for tweened/dragged objects
body.moves = true;                    // affected by velocity/gravity

// Velocity
body.setVelocity(x, y);
body.setVelocityX(x); body.setVelocityY(y);
body.setMaxVelocity(x, y);
body.setMaxSpeed(speed);

// Acceleration
body.setAcceleration(x, y);

// Drag (reduces speed per second)
body.setDrag(x, y);
body.setAllowDrag(false);
body.setDamping(true);

// Gravity
body.setGravity(x, y);
body.setAllowGravity(false);

// Bounce (0 = none, 1 = same velocity, >1 = increased)
body.setBounce(x, y);
body.setCollideWorldBounds(true);

// Angular
body.setAngularVelocity(v);
body.setAngularAcceleration(v);
body.setAngularDrag(v);
body.setAllowRotation(true);

// Collision shape
body.setSize(width, height, center);
body.setCircle(radius, offsetX, offsetY);
body.setOffset(x, y);

// Collision categories (bitmask)
body.setCollisionCategory(1 << 0);
body.setCollidesWith([1 << 1, 1 << 2]);
body.resetCollisionCategory();

// Friction (immovable bodies)
body.setFriction(x, y);

// Slide factor (0-1, velocity retention when pushed)
body.slideFactor.set(x, y);
```

### Collision & Overlap

```js
// Persistent
this.physics.add.collider(objA, objB, callback, processCallback, scope);
this.physics.add.overlap(objA, objB, callback, processCallback, scope);

// One-shot test
this.physics.world.collide(obj1, obj2);    // returns boolean
this.physics.world.overlap(obj1, obj2);

// Area queries
this.physics.overlapRect(x, y, w, h, isDynamic, isStatic);
this.physics.overlapCirc(x, y, r, isDynamic, isStatic);
```

### World

```js
this.physics.world.setBounds(x, y, width, height);
this.physics.world.setBoundsCollision(left, right, up, down);
this.physics.world.gravity.x = gx;
this.physics.world.gravity.y = gy;
this.physics.world.timeScale = 0.5;
this.physics.world.setFPS(framerate);
this.physics.pause() / resume();
```

### Groups

```js
const group = this.physics.add.group({ classType: Phaser.GameObjects.Sprite, maxSize: 50 });
const staticGroup = this.physics.add.staticGroup();
group.setVelocity(x, y, step);
group.refresh();
```

### Touching State

```js
body.touching;       // { up, down, left, right, none }
body.wasTouching;    // previous frame
body.onFloor();      // blocked.down
body.onCeiling();    // blocked.up
body.onWall();       // blocked.left || right
body.hitTest(x, y);
```

### Debug

```js
this.physics.world.defaults.debugShowBody = true;
this.physics.world.defaults.bodyDebugColor = 0xff00ff;
this.physics.world.defaults.debugShowVelocity = true;
```

### Events

```js
this.physics.world.on('worldstep', (delta) => {});
this.physics.world.on('collide', (go1, go2, body1, body2) => {});
this.physics.world.on('overlap', (go1, go2, body1, body2) => {});
this.physics.world.on('worldbounds', (body, up, down, left, right) => {});
```

---

## Type Hierarchy

```
EventEmitter
  └── Phaser.GameObjects.GameObject
        ├── Phaser.GameObjects.Image      (static textures, no animation)
        ├── Phaser.GameObjects.Sprite     (textures + animation)
        ├── Phaser.GameObjects.Shape      (base for geometric primitives)
        │     ├── Arc / Circle
        │     ├── Rectangle
        │     ├── Triangle
        │     ├── Ellipse
        │     ├── Star
        │     ├── Polygon
        │     ├── Line
        │     ├── Curve
        │     ├── Grid
        │     ├── IsoBox / IsoTriangle
        │     └── ...
        ├── Phaser.GameObjects.Text
        ├── Phaser.GameObjects.BitmapText
        ├── Phaser.GameObjects.Graphics
        ├── Phaser.GameObjects.Container
        ├── Phaser.GameObjects.TileSprite
        ├── Phaser.GameObjects.Video
        ├── Phaser.GameObjects.RenderTexture
        ├── Phaser.GameObjects.Particles.ParticleEmitter
        ├── Phaser.GameObjects.DOMElement
        ├── Phaser.GameObjects.Mesh
        ├── Phaser.GameObjects.NineSlice
        └── ...
```

**Key:** Image, Sprite, Shape are **siblings** — each extends GameObject directly. Sprite does NOT extend Image. They share components via mixins:

| Component | Image | Sprite | Shape |
|-----------|-------|--------|-------|
| Alpha | per-corner | per-corner | single |
| BlendMode | yes | yes | yes |
| Depth | yes | yes | yes |
| Flip | yes | yes | no |
| GetBounds | yes | yes | yes |
| Mask | yes | yes | yes |
| Origin | yes | yes | yes |
| Pipeline | yes | yes | yes |
| ScrollFactor | yes | yes | yes |
| Size | yes | yes | yes |
| TextureCrop | yes | yes | no |
| **Tint** | **yes** | **yes** | **no** |
| Transform | yes | yes | yes |
| Visible | yes | yes | yes |
| **Animation** | **no** | **yes** | **no** |
| FillStyle | no | no | yes |
| StrokeStyle | no | no | yes |

For a union type covering both Shape and Image:
```ts
type SlopeSprite = Phaser.GameObjects.Shape | Phaser.GameObjects.Image;
```

Both have: `x`, `y`, `setPosition()`, `setDepth()`, `setAlpha()`, `setScale()`, `setRotation()`, `setOrigin()`, `setScrollFactor()`, `setVisible()`, `destroy()`, `displayWidth`, `displayHeight`.

Shape has `setFillStyle()`, `setStrokeStyle()` but NOT `setTint()`.
Image/Sprite has `setTint()`, `clearTint()` but NOT fill/stroke.
