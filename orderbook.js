/**
 * In order to prevent race conditions, I have resorted to queueing technique.
 * 
 * My other options were:
 * 1. Lock-free programming: Overkill, too advanced and too hard to test, 
 * given the scope of the task and the timeframe
 * 2. Using Mutex - `async-mutex` library, for Mutual Exclusion,
 * protecting shared data from being simultaneously accessed by multiple threads.
 * Again, might be an overkill, plus it is additional package to be introduced to app
 * 
 * With `async-mutex`, submitOrder and distributeOrder functions should look like this:
  
const submitOrder = async (clientId, order) => {
  const release = await mutex.acquire()
  try {
    const book = orderbooks.get(clientId)
    book.push(order)
    distributeOrder(clientId, order)
  } finally {
    release()
  }
}

const distributeOrder = async (clientId, order) => {
  const release = await mutex.acquire()
  try {
    for (let [id, book] of orderbooks.entries()) {
      if (id !== clientId) {
        book.push(order)
        matchOrders(id)
      }
    }
  } finally {
    release()
  }
}

 * For production, in real-world project, I would propose and discuss these options with the team.
 * 
 */

const orderbooks = new Map()
const queues = new Map()

const createOrderbook = (clientId) => {
  orderbooks.set(clientId, [])
  queues.set(clientId, Promise.resolve())
}

const submitOrder = (clientId, order) => {
  queues.set(clientId, queues.get(clientId).then(() => {
    const book = orderbooks.get(clientId)
    book.push(order)
    distributeOrder(clientId, order)
  }))
}

const distributeOrder = (clientId, order) => {
  for (let [id, book] of orderbooks.entries()) {
    if (id === clientId) continue
    queues.set(id, queues.get(id).then(() => {
      book.push(order)
      matchOrders(id)
    }))
  }
}

const matchOrders = (clientId) => {
  const book = orderbooks.get(clientId)
  for (const order1 of book) {
    for (const order2 of book) {
      if (order1.price !== order2.price) continue
      // match found, calculate the remainder
      const remainder = Math.abs(order1.quantity - order2.quantity)
      if (remainder > 0) {
        // add the remainder back to the orderbook
        const remainderOrder = {
          price: order1.price,
          quantity: remainder,
        }
        book.push(remainderOrder)
      }
      // remove matched orders from book
      book.splice(book.indexOf(order2), 1)
      book.splice(book.indexOf(order1), 1)
      return
    }
  }
}

module.exports = {
  createOrderbook,
  submitOrder,
}
