/**
 * 内存缓存系统
 * 相同图片 hash 缓存分析结果，避免重复调用 AI API
 */
import crypto from 'crypto'
import logger from './logger.js'

export class AnalysisCache {
  constructor(ttlMs = 30 * 60 * 1000) {
    this.cache = new Map()
    this.ttl = ttlMs
    this.hits = 0
    this.misses = 0
  }

  _hash(imageBase64) {
    return crypto.createHash('sha256').update(imageBase64).digest('hex')
  }

  get(imageBase64) {
    const key = this._hash(imageBase64)
    const entry = this.cache.get(key)
    if (!entry) { this.misses++; return null }
    if (Date.now() - entry.createdAt > this.ttl) {
      this.cache.delete(key)
      this.misses++
      return null
    }
    this.hits++
    logger.debug(`缓存命中 | 命中率: ${this.getHitRate()}`)
    return entry.data
  }

  set(imageBase64, data) {
    const key = this._hash(imageBase64)
    this.cache.set(key, { data, createdAt: Date.now() })
    if (this.cache.size > 50) {
      const oldest = this.cache.keys().next().value
      this.cache.delete(oldest)
    }
  }

  getHitRate() {
    const total = this.hits + this.misses
    return total === 0 ? '0%' : `${(this.hits / total * 100).toFixed(1)}%`
  }

  clear() { this.cache.clear(); this.hits = 0; this.misses = 0 }

  stats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      ttl: this.ttl / 1000 + 's',
    }
  }
}