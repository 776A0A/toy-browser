const net = require('net')

class Request {
	constructor(options) {
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
		// 根据不同的类型做不同的body处理
		if (this.headers['Content-Type'] === 'application/json') {
			// 字符串形式
			this.bodyText = JSON.stringify(this.body)
		} else if (
			this.headers['Content-Type'] === 'application/x-www-form-urlencoded'
		) {
			// 拼接成key=value&key=value的形式
			this.bodyText = Object.keys(this.body)
				.map(
					key =>
						`${encodeURIComponent(key)}=${encodeURIComponent(this.body[key])}`
				)
				.join('&')
		}

		this.headers['Content-Length'] = this.bodyText.length
	}
	// 请求头
	toString() {
		// 这里注意缩进问题
		return `${this.method.toUpperCase()} ${this.path} HTTP/1.1\r
${Object.keys(this.headers)
	.map(key => `${key}: ${this.headers[key]}`)
	.join('\r\n')}
\r
${this.bodyText}`
	}
	send(connection) {
		return new Promise((resolve, reject) => {
			const parser = new ResponseParser()
			if (connection) {
				connection.write(this.toString())
			} else {
				connection = net.createConnection(
					{
						port: this.port,
						host: this.host
					},
					() => {
						console.log('connected to server')
						connection.write(this.toString())
					}
				)
			}
			connection.on('data', data => {
				parser.receive(data.toString())
				// resolve(data.toString())
				connection.end()
			})
			connection.on('error', err => {
				reject(err)
				connection.end()
			})
		})
	}
}

class Response {}

class ResponseParser {
	constructor() {
		this.WAITING_STATUS_LINE = 0
		this.WAITING_STATUS_LINE_END = 1
		this.WAITING_HEADER_NAME = 2
		this.WAITING_HEADER_SPACE = 3
		this.WAITING_HEADER_VALUE = 4
		this.WAITING_HEADER_LINE_END = 5
		this.WAITING_HEADER_BLOCK_END = 6
		this.WAITING_BODY = 7

		this.current = this.WAITING_STATUS_LINE
		this.statusLine = ''
		this.headers = {}
		this.headerName = ''
		this.headerValue = ''
		this.bodyParser = null
	}
	receive(string) {
		let i = 0
		for (; i < string.length; i++) {
			this.receiveChar(string.charAt(i))
		}
	}
	receiveChar(char) {
		if (this.current === this.WAITING_STATUS_LINE) {
			if (char === '\r') {
				this.current = this.WAITING_STATUS_LINE_END
			} else if (char === '\n') {
				this.current = this.WAITING_HEADER_NAME
			} else {
				this.statusLine += char
			}
		} else if (this.current === this.WAITING_STATUS_LINE_END) {
			if (char === '\n') this.current = this.WAITING_HEADER_NAME
		} else if (this.current === this.WAITING_HEADER_NAME) {
			if (char === ':') this.current = this.WAITING_HEADER_SPACE
			// 循环完之后就跑到这里，准备拿取body
			else if (char === '\r') {
				this.current = this.WAITING_HEADER_BLOCK_END
				// 根据不同的transfer-encoding生成不同的parser
				if (this.headers['Transfer-Encoding'] === 'chunked') {
					this.bodyParser = new TrunkedBodyParser()
				}
			} else this.headerName += char
		} else if (this.current === this.WAITING_HEADER_SPACE) {
			if (char === ' ') this.current = this.WAITING_HEADER_VALUE // key和value之间有:冒号，然后是一个空格
		} else if (this.current === this.WAITING_HEADER_VALUE) {
			if (char === '\r') {
				this.current = this.WAITING_HEADER_LINE_END
				this.headers[this.headerName] = this.headerValue
				this.headerName = this.headerValue = ''
			} else this.headerValue += char
		} else if (this.current === this.WAITING_HEADER_LINE_END) {
			if (char === '\n') this.current = this.WAITING_HEADER_NAME // 这里会进入一个循环，反复的去取header
		} else if (this.current === this.WAITING_HEADER_BLOCK_END) {
			if (char === '\n') this.current = this.WAITING_BODY
		} else if (this.current === this.WAITING_BODY) {
			this.bodyParser.receiveChar(char)
		}
	}
}

class TrunkedBodyParser {
	constructor() {}
	receiveChar(char) {
		// 连续的\r\n就是一行，\r就是换到行首，\n就是换到行尾
		console.log(JSON.stringify(char))
	}
}

void (async function () {
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
	console.log(response)
})()
