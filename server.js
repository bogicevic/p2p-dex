const { PeerRPCServer }  = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')
const { createOrderbook, submitOrder } = require('./orderbook')

const link = new Link({
  grape: 'http://127.0.0.1:30001'
})

link.start()

const peer = new PeerRPCServer(link, {
  timeout: 300000
})
peer.init()

const port = 1024 + Math.floor(Math.random() * 1000)
const service = peer.transport('server')
service.listen(port)

setInterval(() => {
  link.announce('rpc_orderbook', service.port, {})
}, 1000)

service.on('request', (rid, key, payload, handler) => {
  console.log(payload)
  if (payload.action === 'createOrderbook') {
    createOrderbook(payload.clientId)
  } else if (payload.action === 'submitOrder') {
    submitOrder(payload.clientId, payload.order)
  }
  handler.reply(null, { msg: 'Order Submitted / OrderBook Created' })
})
