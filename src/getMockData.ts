import { existsSync } from 'fs'
import bodyParser from 'body-parser'
import assert from 'assert'
import pathToRegexp from 'path-to-regexp'
// import multer from 'multer'
import { join } from 'path'
import glob from 'glob'
import { RequestHandler } from 'express'

const debug = require('debug')('quick-mock:getMockData')

const VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete']
const BODY_PARSED_METHODS = ['post', 'put', 'patch', 'delete']

function createHandler(method: string, path: string, handler: any): RequestHandler {
  return function(req, res, next) {
    if (BODY_PARSED_METHODS.includes(method)) {
      bodyParser.json({ limit: '5mb', strict: false })(req, res, () => {
        bodyParser.urlencoded({ limit: '5mb', extended: true })(req, res, () => {
          sendData()
        })
      })
    } else {
      sendData()
    }
    function sendData() {
      if (typeof handler === 'function') {
        handler(req, res, next)
      } else {
        res.json(handler)
      }
    }
  }
}

function parseKey(key: string) {
  let method = 'get'
  let path = key
  if (/\s+/.test(key)) {
    const splited = key.split(/\s+/)
    method = splited[0].toLowerCase()
    path = splited[1] // eslint-disable-line
  }
  assert(
    VALID_METHODS.includes(method),
    `Invalid method ${method} for path ${path}, please check your mock files.`
  )
  return {
    method,
    path,
  }
}

function normalizeConfig(config: MockConfig) {
  return Object.keys(config).reduce<MockData[]>((memo, key) => {
    const handler = config[key]
    const type = typeof handler
    assert(
      type === 'function' || type === 'object',
      `mock value of ${key} should be function or object, but got ${type}`
    )
    const { method, path } = parseKey(key)
    const keys = []
    const re = pathToRegexp(path, keys)
    memo.push({
      method,
      path,
      re,
      keys,
      handler: createHandler(method, path, handler),
    })
    return memo
  }, [])
}

export function getMockConfigFromFiles(files: string[]): MockConfig {
  return files.reduce<MockConfig>((memo, mockFile) => {
    try {
      const m = require(mockFile) // eslint-disable-line
      memo = {
        ...memo,
        ...(m.default || m),
      }
      return memo
    } catch (e) {
      throw new Error(e.stack)
    }
  }, {})
}

function getMockFiles(opts: Options) {
  const { cwd } = opts
  const mockFiles = glob
    .sync('mock/**/*.[jt]s', {
      cwd,
    })
    .map(p => join(cwd, p))
  debug(`load mock data from mock folder, including files ${JSON.stringify(mockFiles)}`)
  return mockFiles
}

function getMockConfig(opts): MockConfig {
  const files = getMockFiles(opts)
  debug(`mock files: ${files.join(', ')}`)
  return getMockConfigFromFiles(files)
}

export default function(opts: Options) {
  try {
    return normalizeConfig(getMockConfig(opts))
  } catch (e) {
    console.error('Mock files parse failed')
  }
}

interface Options {
  cwd: string
}
interface MockConfig {
  [method_path: string]: any
}
export interface MockData {
  method: string
  path: string
  re: RegExp
  keys: pathToRegexp.Key[]
  handler: RequestHandler
}
