/**
 * 生成提示词库 tabbar 图标 (81x81 PNG, 灯泡造型)
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 81

// CRC32 查找表
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([len, typeAndData, crc])
}

function generatePNG(r, g, b, a, pixelFn) {
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // 像素数据
  const raw = []
  for (let y = 0; y < SIZE; y++) {
    raw.push(0) // filter none
    for (let x = 0; x < SIZE; x++) {
      const [pr, pg, pb, pa] = pixelFn(x, y)
      raw.push(pr, pg, pb, pa)
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw))

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

// 灯泡图标绘制函数
function bulbPixel(x, y, r, g, b, a) {
  const cx = 40.5, cy = 34 // 灯泡中心偏上
  const bulbRx = 20, bulbRy = 22 // 灯泡椭圆半径

  // 底座区域
  const baseTop = 52, baseBot = 66, baseLeft = 30, baseRight = 52

  // 灯泡椭圆
  const dx = (x - cx) / bulbRx, dy = (y - cy) / bulbRy
  const dist = dx * dx + dy * dy

  if (dist <= 1.0 && y < baseTop) {
    // 灯泡体 - 边缘渐变
    const edgeDist = 1.0 - dist
    const alpha = edgeDist > 0.15 ? a : Math.round(a * edgeDist / 0.15)
    return [r, g, b, alpha]
  }

  // 灯泡到基座的连接
  if (y >= 44 && y < baseTop) {
    const t = (y - 44) / (baseTop - 44)
    const halfW = 16 - t * 6
    if (Math.abs(x - cx) <= halfW) {
      return [r, g, b, a]
    }
  }

  // 底座 (3条横线)
  if (y >= baseTop && y <= baseBot && x >= baseLeft && x <= baseRight) {
    const lineH = 4
    const gap = 2
    const relY = y - baseTop
    const lineIdx = Math.floor(relY / (lineH + gap))
    const inLine = relY - lineIdx * (lineH + gap)
    if (lineIdx < 3 && inLine < lineH) {
      return [r, g, b, a]
    }
  }

  return [0, 0, 0, 0]
}

const outDir = path.resolve(__dirname, '../../src/static/tabbar')

// 灰色未选中
const grayPNG = generatePNG(0, 0, 0, 0, (x, y) => bulbPixel(x, y, 153, 153, 153, 255))
fs.writeFileSync(path.join(outDir, 'prompt.png'), grayPNG)
console.log(`✓ prompt.png (${grayPNG.length} bytes)`)

// 紫色选中 (#6366F1)
const purplePNG = generatePNG(0, 0, 0, 0, (x, y) => bulbPixel(x, y, 99, 102, 241, 255))
fs.writeFileSync(path.join(outDir, 'prompt-active.png'), purplePNG)
console.log(`✓ prompt-active.png (${purplePNG.length} bytes)`)