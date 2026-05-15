/**
 * 熔断器中间件
 * 连续失败达到阈值后自动熔断，保护下游服务
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.recoveryTimeout = options.recoveryTimeout || 30_000
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 1
    this.timeoutMs = options.timeoutMs || 15_000

    this.state = 'closed'
    this.failures = 0
    this.lastFailureTime = 0
    this.halfOpenCalls = 0
  }

  async execute(fn, label = 'API') {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        const remain = Math.ceil((this.recoveryTimeout - (Date.now() - this.lastFailureTime)) / 1000)
        throw new Error(`服务暂时不可用，${remain}秒后自动恢复 (熔断中)`)
      }
      this.state = 'half_open'
      this.halfOpenCalls = 0
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 调用超时`)), this.timeoutMs)
    )

    try {
      const result = await Promise.race([fn(), timeoutPromise])
      this._onSuccess()
      return result
    } catch (err) {
      this._onFailure(err, label)
      throw err
    }
  }

  _onSuccess() {
    this.failures = 0
    if (this.state === 'half_open') {
      this.state = 'closed'
    }
  }

  _onFailure(err, label) {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold && this.state !== 'open') {
      this.state = 'open'
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      threshold: this.failureThreshold,
      recoveryIn: this.state === 'open'
        ? Math.max(0, this.recoveryTimeout - (Date.now() - this.lastFailureTime))
        : 0,
    }
  }
}