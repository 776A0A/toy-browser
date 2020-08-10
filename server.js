const http = require('http')

const server = http.createServer((req, res) => {
	console.log('request received')
	console.log(req.headers);
	res.setHeader('Content-Type', 'text/html')
	res.setHeader('X-Foo', 'foo')
	res.writeHead(200, { 'Content-Type': 'text/plain' })
	res.end(
`<html maaa=a>
<head>
	<style>
		body #my {
			color: red;
			width: 50px;
		}
		body {
			font-size: 50px;
		}
	</style>
</head>
<body>
	<p>123</p>
	<div id="my">my</div>
</body>
</html>`
	)
})

server.listen(8088)
