import { execSync } from 'node:child_process'
import { createClientServer } from './server/clientServer'
import { createForwardServer } from './server/forwardServer'
import { clientServerOption } from './config'

/** 查找占用指定端口的进程，并关闭 */
const killPort = port => {
  try {
    const pid = execSync(`lsof -ti:${port}`)
    execSync(`kill -9 ${pid}`)
    console.log(`找到占用端口 ${port} 的进程，并杀死PID ${pid}`)
  } catch (e) {
    console.log(`没有找到占用端口 ${port} 的进程`)
  }
}

killPort(clientServerOption.port)

createClientServer()

createForwardServer()

process.on('uncaughtException', err => {
  console.error('出错了', err.message)
})
