import http from 'node:http'
import path from 'node:path'
import https from 'node:https'
import fs from 'node:fs'
import net from 'node:net'
import tls from 'node:tls'
import qs from 'node:querystring'
import { createCert } from 'mkcert'

const ca = {
  key: fs.readFileSync(path.join(__dirname, './rootCA-key.pem')).toString(),
  cert: fs.readFileSync(path.join(__dirname, './rootCA.pem')).toString(),
}

/** 当前正在代理的host */
const proxyHost = {}

/** 和浏览器交互的 server */
const server = http
  .createServer(async (request, response) => {
    const { url, method } = request

    if (method === 'POST') {
      const body = await new Promise<any>(resolve => {
        let data = ''
        request.on('data', chunk => (data += chunk.toString()))
        request.on('end', () => resolve(JSON.parse(data)))
      })

      if (url?.split('?')[0] === '/api/proxyHost') {
        const { origin, css, js } = body
        const host = origin.split('://')[1]

        proxyHost[host] = { origin, css, js }

        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ success: true }))
      }
    } else if (method === 'GET') {
      const query = qs.parse(url?.slice(2) || '{}')
    }
  })
  .listen(7000, '127.0.0.1', () => {
    console.log(`Server running at http://127.0.0.1:7000`)
  })

/** 和第三方目标服务器交互的 server */
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
}).listen(6000, '127.0.0.1', () => {
  console.log(`Server running at https://127.0.0.1:6000`)
})

server.on('connect', (req, clientSocket, head) => {
  /** 解析目标主机和端口 */
  const [host, port] = req.url?.split(':') || []
  const currentHost = proxyHost[host]

  const proxySocket = net.connect(
    {
      host: '127.0.0.1',
      port: 7890,
    },
    () => {
      console.log('已连接到代理服务器', host, port)
      const targetHost = currentHost ? '127.0.0.1' : host
      const targetPort = currentHost ? 6000 : port

      proxySocket.write(`CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\n\r\n`)
      proxySocket.write(head)
      proxySocket.pipe(clientSocket)

      clientSocket.pipe(proxySocket)
    }
  )

  /** 处理代理服务器连接中断 */
  proxySocket.on('end', () => {
    clientSocket.end()
  })

  /** 处理客户端连接中断 */
  clientSocket.on('end', () => {
    proxySocket.end()
  })
})

/** 监听向代理转发服务发送的请求 */
proxy.on('request', async (request, response) => {
  const { headers: reqHeaders, url, method } = request
  const { origin, css, js } = proxyHost[reqHeaders.host!]
  const res = await fetch(origin + url, { headers: reqHeaders as any, method })
  const { status, headers: resHeaders } = res
  const headers = Array.from(resHeaders.keys()).reduce((prev, key) => {
    return { ...prev, [key]: resHeaders.get(key) }
  }, {})
  const responseText = await res.text()

  delete proxyHost[reqHeaders.host!]

  response.writeHead(status, { ...headers, 'content-encoding': 'identity' })
  response.end(
    responseText.replace(
      '</body>',
      `<style>${css}</style><script>${js}</script></body>`
    )
  )
})

process.on('uncaughtException', err => {
  console.error('出错了', err.message)
})
