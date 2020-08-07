const EOF = Symbol('EOF')
const lettersRx = /^[a-zA-Z]$/

let currentToken = null

module.exports.parseHTML = function parseHTML(html) {
	let state = data
	for (const s of html) {
		state = state(s)
	}
	state = state(EOF)
}

function data(s) {
	if (s === '<') return tagOpen
	else if (s === EOF) return
	else return data
}

function tagOpen(s) {
	if (s === '/') return endTagOpen
	else if (lettersRx.test(s)) return tagName(s)
	else return
}

function endTagOpen(s) {
	if (s.match(lettersRx)) {
		currentToken = {
			type: 'endTag',
			tagName: RegExp.lastMatch
		}
		return tagName(s)
	} else if (s === '>') {
	} else if (s === EOF) {
	} else return
}

function tagName(s) {
	if (/^[\t\n\f ]$/.test(s)) return beforeAttributeName
	else if (s === '/') return selfClosingStartTag
	else if (lettersRx.test(s)) return tagName
	else if (s === '>') return data
	else return tagName
}

function beforeAttributeName(s) {}
function selfClosingStartTag(s) {}
