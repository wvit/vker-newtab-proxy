/** 当前正在代理的host */
export const proxyHost = {}

/** web server配置 */
export const { proxyServerOption, clientServerOption, forwardServerOption } = {
  proxyServerOption: { host: '127.0.0.1', port: 7890, protocol: 'http' },
  clientServerOption: { host: '127.0.0.1', port: 7000 },
  forwardServerOption: { host: '127.0.0.1', port: 6000 },
}
