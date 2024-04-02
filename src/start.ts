import path from 'node:path'
import fs from 'node:fs'
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

/** 加入开机自启 */
const startUp = () => {
//   fs.writeFileSync(
//     `${path.join(process.execPath, '../startup.plist')}`,
//     `
// <?xml version="1.0" encoding="UTF-8"?>
// <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
// <plist version="1.0">
// <dict>
//     <key>Label</key>
//     <string>com.example.startup</string>
//     <key>ProgramArguments</key>
//     <array>
//         <string>/bin/bash</string>
//         <string>/Users/wv/Desktop/wv/node-server/app/start</string>
//     </array>
//     <key>RunAtLoad</key>
//     <true/>
// </dict>
// </plist>
// `
//   )

  execSync(
    `sudo chmod 777 ${path.join(process.execPath, '../startup.plist')}`
  )

  execSync(
    `sudo launchctl load ${path.join(process.execPath, '../startup.plist')}`
  )
}

killPort(6000)
startProxy()
startUp()
