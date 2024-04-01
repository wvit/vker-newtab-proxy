const http = require('http')
const https = require('https')
const path = require('path')
const fs = require('fs')
const net = require('net')
const tls = require('tls')
const { createCert } = require('mkcert')
const { execSync } = require('child_process')

const mkcertRoot = execSync('mkcert -CAROOT').toString().trim()
const ca = {
  key: fs.readFileSync(path.join(mkcertRoot, 'rootCA-key.pem')),
  cert: fs.readFileSync(path.join(mkcertRoot, 'rootCA.pem')),
}

const server = http.createServer((request, response) => {
  response.statusCode = 200
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Content-Type', 'text/plain')
  response.end('hello http')
})

const proxy = new https.Server({
  SNICallback: async (hostname, callback) => {
    const cert = await createCert({
      ca,
      domains: [hostname],
      validity: 1,
    })

    callback(
      null,
      tls.createSecureContext({
        key: cert.key,
        cert: cert.cert,
      })
    )
  },
})

server.listen(7000, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:7000`)
})

server.on('connect', (req, clientSocket, head) => {
  // 解析目标主机和端口
  const [host, port] = req.url.split(':')

  console.log(11111, req.url)

  // 连接到目标服务器
  const serverSocket = net.connect(6000, '127.0.0.1', () => {
    // 将客户端和目标服务器之间的数据流连接起来
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
    serverSocket.write(head)

    serverSocket.pipe(clientSocket)
    clientSocket.pipe(serverSocket)
  })

  /** 处理目标服务器连接中断 */
  serverSocket.on('end', () => {
    clientSocket.end()
  })

  /** 处理客户端连接中断 */
  clientSocket.on('end', () => {
    serverSocket.end()
  })
})

proxy.listen(6000, '127.0.0.1', () => {
  console.log(`Server running at https://127.0.0.1:6000`)
})

proxy.on('request', (request, response) => {
  if (
    request.method === 'GET' &&
    request.url.indexOf('vker-desktop-proxy') !== -1
  ) {
    console.log(111111, request.url)
    fetch('https://baidu.com' + request.url, {
      headers: request.headers,
      method: 'GET',
    })
      .then(res => res.text())
      .then(res => {
        response.writeHead(200)
        response.end(res)
      })
  } else {
    response.writeHead(200)
    response.end('sorry "vker-desktop" 浏览器插件不小心代理了你的请求')
  }
})

process.on('uncaughtException', err => {
  console.error('出错了', err.message)
})
