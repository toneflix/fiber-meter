import { app } from './app.js'
import { env } from './config/env.js'

app.listen(env.port, env.host, () => {
  console.log(`FiberMeter API on ${env.host}:${env.port}`)
})
