import path from 'node:path'
import { spawn, execSync } from 'node:child_process'

/** 查找占用指定端口的进程，并关闭 */
const killPort = port => {
  try {
    const pid = execSync(`lsof -ti:${port}`)
    execSync(`kill -9 ${pid}`)
    console.log(`找到占用端口 ${port} 的进程，并杀死 ${pid}`)
  } catch (e) {
    console.log(`没有找到占用端口 ${port} 的进程`)
  }
}

/** 启动代理配置 */
const startProxy = () => {
  const childProcess = spawn(
    `${path.join(process.execPath, '../server')}`,
    [],
    {
      /** 使用系统shell */
      shell: true,
      /** 和父进程分离运行 */
      detached: true,
      /** 关闭子进程标准输入，输出 */
      stdio: 'ignore',
    }
  )

  /** 监听进程的输出信息 */
  // childProcess.stdout.on('data', data => {
  //   console.log(data.toString())
  // })

  /** 让父进程退出，子进程继续独立运行 */
  childProcess.unref()
}

killPort(6000)
startProxy()
