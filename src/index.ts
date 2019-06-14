import { join } from 'path'
import chokidar from 'chokidar'
import matchMock from './matchMock'
import getMockData from './getMockData'
import { RequestHandler } from 'express'
const debug = require('debug')('quick-mock:createMiddleware')

export default function createMiddleware(options: Options = {} as any): RequestHandler {
  const { cwd = process.cwd(), watch = true } = options
  let mockData = null
  const paths = [join(cwd, 'mock')]
  function fetchMockData() {
    mockData = getMockData({
      cwd,
      // config,
      // onError(e) {
      //   errors.push(e)
      // },
    })
  }
  function cleanRequireCache() {
    Object.keys(require.cache).forEach(file => {
      if (
        paths.some(path => {
          return file.indexOf(path) > -1
        })
      ) {
        delete require.cache[file]
      }
    })
  }
  fetchMockData()
  if (watch) {
    const watcher = chokidar.watch(paths, {
      ignoreInitial: true,
    })

    watcher.on('all', (event, file) => {
      debug(`[${event}] ${file}, reload mock data`)
      cleanRequireCache()
      fetchMockData()
    })
  }
  return function mockMiddleware(req, res, next) {
    // debug('req', req && req.path, debug.enabled, debug.namespace, process.env.DEBUG)
    const match = mockData && matchMock(req, mockData)
    if (match) {
      debug(`mock matched: [${match.method}] ${match.path}`)
      return match.handler(req, res, next)
    } else {
      return next()
    }
  }
}

interface Options {
  cwd?: string
  watch?: boolean
}
