const EOF = Symbol('EOF')
const lettersRx = /^[a-zA-Z]$/
const spaceRx = /^[\t\n\f ]$/

let currentToken = null
let currentAttribute = null
let currentTextNode = null

const stack = [
	{
		type: 'document',
		children: []
	}
]

module.exports.parseHTML = function parseHTML(html) {
	let state = data
	for (const s of html) {
		state = state(s)
	}
	state = state(EOF)
}

function emit(token) {
	const top = stack[stack.length - 1]
	if (token.type === 'startTag') {
		const element = {
			type: 'element',
			children: [],
			attributes: []
		}
		element.tagName = token.tagName
		for (const t in token) {
			if (token.hasOwnProperty(t)) {
				if (t !== 'type' && t !== 'tagName') {
					element.attributes.push({
						name: t,
						value: token[t]
					})
				}
			}
		}

		top.children.push(element)
		element.parent = top

		if (!token.isSelfClosing) {
			stack.push(element)
		}
		currentTextNode = null
	} else if (token.type === 'endTag') {
		if (top.tagName !== token.tagName) {
			throw new Error("tag start end doesn't match")
		} else {
			stack.pop()
		}
		currentTextNode = null
	} else if (token.type === 'text') {
		if (currentTextNode == null) {
			currentTextNode = {
				type: 'text',
				content: ''
			}
			top.children.push(currentTextNode)
		}
		currentTextNode.content += token.content
	}
}

function data(s) {
	// 这里有三种情况，开始；结束；自封闭标签
	if (s === '<') return tagOpen
	else if (s === EOF) {
		emit({ type: 'EOF' })
		return
	} else {
		emit({
			type: 'text',
			content: s
		})
		return data
	}
}

function tagOpen(s) {
	if (s === '/') return endTagOpen
	else if (lettersRx.test(s)) {
		currentToken = {
			type: 'startTag',
			tagName: ''
		}
		return tagName(s)
	} else return
}

function endTagOpen(s) {
	if (lettersRx.test(s)) {
		currentToken = {
			type: 'endTag',
			tagName: ''
		}
		return tagName(s)
	} else if (s === '>') {
		throw Error('parse error')
	} else if (s === EOF) {
		throw Error('parse error')
	} else throw Error('parse error')
}

function tagName(s) {
	// 接收到了空格，那么就进入等待属性状态
	if (spaceRx.test(s)) return beforeAttributeName
	// 自封闭标签
	else if (s === '/') return selfClosingStartTag
	// 回到起始状态
	else if (s === '>') {
		emit(currentToken)
		return data
	} else if (lettersRx.test(s)) {
		currentToken.tagName += s.toLowerCase() // 所以html不缺分大小写
		return tagName
	} else return tagName
}

function beforeAttributeName(s) {
	// 多个空格
	if (spaceRx.test(s)) return beforeAttributeName
	else if (s === '>' || s === '/' || s === EOF) return afterAttributeName(s)
	else if (s === '=') {
	} else {
		currentAttribute = {
			name: '',
			value: ''
		}
		return attributeName(s)
	}
}
function selfClosingStartTag(s) {
	if (s === '>') {
		currentToken.isSelfClosing = true
		return data
	} else if (s === EOF) throw Error()
	else throw Error()
}

function afterAttributeName(s) {
	// 这种情况就是值为true或false的属性
	if (spaceRx.test(s)) return afterAttributeName
	else if (s === '/') return selfClosingStartTag
	else if (s === '=') return beforeAttributeValue
	else if (s === '>') return data
	else if (s === EOF) throw Error()
	else {
		currentToken = {
			type: 'attributeName'
		}
		return attributeName(s)
	}
}

function attributeName(s) {
	if (spaceRx.test(s) || s === '/' || s === '>' || s === EOF)
		return afterAttributeName(s)
	else if (s === '=') return beforeAttributeValue
	else if (s === '<' || s === '"' || s === "'") throw Error()
	else {
		currentToken.name += s
		return attributeName
	}
}

function doubleQuoteAttributeValue(s) {
	if (s === '"') {
		currentToken[currentAttribute.name] = currentAttribute.value
		return afterQuotedAttributeValue
	} else if (s === '\u0000' || s === EOF) {
	} else {
		currentAttribute.value += s
		return doubleQuoteAttributeValue
	}
}

function singleQuoteAttributeValue(s) {
	if (s === "'") {
		currentToken[currentAttribute.name] = currentAttribute.value
		return afterQuotedAttributeValue
	} else if (s === '\u0000' || s === EOF) {
	} else {
		currentAttribute.value += s
		return singleQuoteAttributeValue
	}
}

function afterQuotedAttributeValue(s) {
	if (spaceRx.test(s)) return beforeAttributeName
	else if (s === '/') return selfClosingStartTag
	else if (s === '>') {
		currentToken[currentAttribute.name] = currentAttribute.value
		emit(currentToken)
		return data
	} else if (s === EOF) {
	} else {
		throw Error('missing-whitespace-between-attributes parse error')
		return beforeAttributeName(s)
	}
}

function unquotedAttributeValue(s) {
	if (spaceRx.test(s)) {
		currentToken[currentAttribute.name] = currentAttribute.value
		return beforeAttributeName
	} else if (s === '>') {
		currentToken[currentAttribute.name] = currentAttribute.value
		emit(currentAttribute)
		return data
	} else if (
		s === '"' ||
		s === "'" ||
		s === '<' ||
		s === '=' ||
		s === '`' ||
		s === EOF
	) {
	}
	// 即使遇到了/也会解析为value
	else {
		currentAttribute.value += s
		return unquotedAttributeValue
	}
}

function beforeAttributeValue(s) {
	/**
	 * =等号后面可以有空格?? 标准里这里会处理为转到beforeAttributeName状态，
	 * 但实际实验的时候是会转换为value的，即使是/也会成为value的一部分，直到遇到下一个空格
	 */
	if (spaceRx.test(s)) return beforeAttributeName
	else if (s === '"') return doubleQuoteAttributeValue
	else if (s === "'") return singleQuoteAttributeValue
	else if (s === '>') throw Error()
	else return unquotedAttributeValue(s)
}

function attributeValue(s) {
	if (spaceRx.test(s)) return beforeAttributeName
	else if (s === '>') {
		emit()
		return data
	} else if (s === '"' || s === "'" || s === '=' || s === '<') throw Error()
	else if (s === EOF) throw Error()
	else {
		return attributeValue
	}
}
