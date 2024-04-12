import path from 'node:path'
import https from 'node:https'
import fs from 'node:fs'
import tls from 'node:tls'
import axios from 'axios'
import { createCert } from 'mkcert'
import { proxyHost, forwardServerOption } from '../config'

/** 创建一个转发 web server，用于修改html网页内容 */
export const createForwardServer = () => {
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
    const res = await axios(origin + url, {
      method,
      headers,
      // proxy: proxyServerOption,
    }).catch(e => Promise.resolve(e?.response))
    const { data = '', status, headers: resHeaders } = res || {}
    const responseText = typeof data === 'string' ? data : JSON.stringify(data)

    delete proxyHost[headers.host!]

    response.writeHead(status!, {
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
