# quick-mock-middleware

## 项目介绍

quick-mock-middleware 从[umi-mock](https://github.com/umijs/umi/tree/master/packages/umi-mock)中间件中抽出的，可用于兼容 express、webpack-dev-server 等

## 安装

```
yarn add quick-mock-middleware -D
```

## 使用

### 参数

| 参数名 | 描述                            |
| ------ | ------------------------------- |
| cwd    | 当前目录(默认当前执行目录)      |
| watch  | 是否监控 mock 目录（默认 true） |

### express

```js
const app = express()

// const pwd = path.resolve(__dirname)
app.use(mockMiddleware({ cwd: path.resolve(__dirname) }))
```

### webpack-dev-server

```js
module.exports = {
  devServer: {
    before: app => {
      app.use(mockMiddleware({ cwd: path.resolve(__dirname) }))
    },
  },
}
```
