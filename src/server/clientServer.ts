import http from 'node:http'
import net from 'node:net'
import qs from 'node:querystring'
import {
  proxyHost,
  clientServerOption,
  forwardServerOption,
} from '../config'

/** 创建浏览器交互的 web server */
export const createClientServer = () => {
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
      console.log(host, port, '<-已连服务->', socketOption)

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
