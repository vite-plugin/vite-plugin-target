declare module 'process' {
  global {
    namespace NodeJS {
      interface Process {
        electronApp: import('child_process').ChildProcess
      }
    }
  }
}
