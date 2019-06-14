import express from 'express'
// import mockMiddleware from '../src/index'
import mockMiddleware from '../lib/bundle'
import path from 'path'

const app = express()

// const pwd = path.resolve(__dirname)
app.use(
  mockMiddleware({
    cwd: path.resolve(__dirname),
  })
)

app.use((req, res) => {
  res.send(req.path + '# hhh ')
})

app.listen(3333)
