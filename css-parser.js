const css = require('css')

const cssRules = []

function addCSSRules(text) {
	const ast = css.parse(text)
	console.log(JSON.stringify(ast, null, '  '))
	cssRules.push(...ast.stylesheet.rules)
}

module.exports = {
	addCSSRules,
	cssRules
}
