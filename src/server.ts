import http from 'node:http'
import path from 'node:path'
import https from 'node:https'
import fs from 'node:fs'
import net from 'node:net'
import tls from 'node:tls'
import qs from 'node:querystring'
import axios from 'axios'
import { createCert } from 'mkcert'

/** 当前正在代理的host */
const proxyHost = {}

/** web server配置 */
const { proxyServerOption, clientServerOption, forwardServerOption } = {
  proxyServerOption: { host: '127.0.0.1', port: 7890, protocol: 'http' },
  clientServerOption: { host: '127.0.0.1', port: 7000 },
  forwardServerOption: { host: '127.0.0.1', port: 6000 },
}

/** 创建浏览器交互的 web server */
const createClientServer = () => {
  const clientServer = http.createServer(async (request, response) => {
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

  clientServer.listen(clientServerOption.port, clientServerOption.host, () => {
    console.log('已启动服务', clientServerOption)
  })

  clientServer.on('connect', (req, clientSocket, head) => {
    /** 解析目标主机和端口 */
    const [host, port] = req.url?.split(':') || []
    const currentHost = proxyHost[host]
    const socketOption = currentHost
      ? forwardServerOption
      : { host, port: Number(port) }

    const targetSocket = net.connect(socketOption, () => {
      console.log(host, port, '已连服务器', socketOption)

      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      clientSocket.pipe(targetSocket)

      targetSocket.write(head)
      targetSocket.pipe(clientSocket)
    })

    /** 处理目标服务器连接中断 */
    targetSocket.on('end', () => {
      clientSocket.end()
    })

    /** 处理客户端连接中断 */
    clientSocket.on('end', () => {
      targetSocket.end()
    })
  })
}

/** 创建一个转发 web server，用于修改html网页内容 */
const createForwardServer = () => {
  const ca = {
    key: fs.readFileSync(path.join(__dirname, './rootCA-key.pem')).toString(),
    cert: fs.readFileSync(path.join(__dirname, './rootCA.pem')).toString(),
  }
  const forwardServer = new https.Server({
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

  forwardServer.listen(
    forwardServerOption.port,
    forwardServerOption.host,
    () => {
      console.log('已启动服务', forwardServerOption)
    }
  )

  forwardServer.on('request', async (request, response) => {
    const { headers, url, method } = request
    const { origin, css, js } = proxyHost[headers.host!]
    const {
      data,
      status,
      headers: resHeaders,
    } = await axios(origin + url, {
      method,
      headers,
      // proxy: proxyServerOption,
    })
    const responseText = typeof data === 'string' ? data : JSON.stringify(data)

    delete proxyHost[headers.host!]

    response.writeHead(status, {
      ...(resHeaders as any),
      'content-encoding': 'identity',
    })
    response.end(
      responseText.replace(
        '</body>',
        `<style>${css}</style><script>${js}</script></body>`
      )
    )
  })
}

process.on('uncaughtException', err => {
  console.error('出错了', err.message)
})

createClientServer()

createForwardServer()
