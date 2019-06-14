import { Request } from 'express'
import { MockData } from './getMockData'
export default function matchMock(req: Request, mockData: MockData[]) {
  const { method: origionMethod, path: targetPath } = req
  const targetMethod = origionMethod.toLowerCase()
  for (const mock of mockData) {
    const { method, re, keys } = mock
    if (method === targetMethod) {
      const match = re.exec(targetPath)
      if (match) {
        const params = {}
        for (let i = 1; i < match.length; i += 1) {
          const key = keys[i - 1]
          const prop = key.name
          const val = decodeParam(match[i])
          if (val !== undefined || !Object.prototype.hasOwnProperty.call(params, prop)) {
            params[prop] = val
          }
        }
        req.params = params
        return mock
      }
    }
  }
}

function decodeParam(val: any) {
  if (typeof val !== 'string' || val.length === 0) {
    return val
  }
  try {
    return decodeURIComponent(val)
  } catch (err) {
    if (err instanceof URIError) {
      err.message = `Failed to decode param ' ${val} '`
      // @ts-ignore
      err.status = 400
      // @ts-ignore
      err.statusCode = 400
    }
    throw err
  }
}
