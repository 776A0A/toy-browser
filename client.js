const net = require('net')

class Request {
  constructor (options) {
    const { method, host, port, body, headers, path } = options
    this.method = method || 'GET'
    this.host = host
    this.path = path || '/'
    this.port = port || 80
    this.body = body || {}
    this.headers = headers || {}
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
    if (this.headers['Content-Type'] === 'application/json')
      this.bodyText = JSON.stringify(this.body)
    else if (
      this.headers['Content-Type'] === 'application/x-www-form-urlencoded'
    )
      this.bodyText = Object.keys(this.body)
        .map(
          key =>
            `${encodeURIComponent(key)}=${encodeURIComponent(this.body[key])}`
        )
        .join('&')

    this.headers['Content-Length'] = this.bodyText.length
  }
  toString () {
    return `${this.method.toUpperCase()} ${this.path} HTTP/1.1\r
${Object.keys(this.headers)
        .map(key => `${key}: ${this.headers[key]}`)
        .join('\r\n')}
\r
${this.bodyText}`
  }
  send (connection) {
    return new Promise((resolve, reject) => {
      if (connection) { connection.write(this.toString()) }
      else {
        connection = net.createConnection({
          port: this.port,
          host: this.host
        }, () => {
          console.log('connected to server')
          connection.write(this.toString())
        })
      }
      connection.on('data', data => {
        resolve(data.toString())
        connection.end()
      })
      connection.on('error', err => {
        reject(err)
        connection.end()
      })
    })
  }
}

void async function () {
  const request = new Request({
    method: 'post',
    host: '127.0.0.1',
    port: 8088,
    body: { name: 'wj' },
    headers: {
      'X-Bar': 'wj'
    }
  })

  const response = await request.send()
  console.log(response);
}()

class Response { }

// const client = net.createConnection({ port: 8088, host: '127.0.0.1' }, () => {
//   console.log('connected to server')
//   const request = new Request({
//     method: 'post',
//     host: '127.0.0.1',
//     port: 8088,
//     body: { name: 'wj' },
//     headers: {
//       'X-Bar': 'wj'
//     }
//   })
//   // console.log(request.toString())
//   client.write(request.toString())
// })
// client.on('data', data => {
//   console.log(data.toString())
//   client.end()
// })
// client.on('end', () => {
//   console.log('disconnected from server')
// })
