const { addCSSRules, cssRules } = require('./css-parser')

const EOF = Symbol('EOF')
const lettersRx = /^[a-zA-Z]$/
const spaceRx = /^[\t\n\f ]$/

let currentToken = null
let currentAttribute = null
let currentTextNode = null

function computeCSS(element) {
	/**
	 * 在匹配css规则的时候，必须得到该元素所有的上级元素，才能判断规则是否匹配
	 * 最先进行匹配的肯定是当前元素，如果当前元素都不匹配，那就不用匹配上级元素了
	 * 所以，css选择器的匹配是从右到左，先匹配具体的，然后匹配上级
	 * 如果在body内写style标签，那么很可能会使得原来的计算得到的css-ast完全无用
	 */
	const elements = stack.slice().reverse()

	if (!element.computedStyle) element.computedStyle = {}

	for (const rule of cssRules) {
		const selectorParts = rule.selectors[0].split(' ').reverse()

		if (!match(element, selectorParts[0])) continue

		let matched
		let i = 0,
			j = 1
		for (; i < elements.length; i++) {
			if (match(elements[i], selectorParts[j])) j++
		}

		if (j >= selectorParts.length) matched = true

		if (matched) {
			const sp = specificity(rule.selectors[0])
			const computedStyle = element.computedStyle
			for (const d of rule.declarations) {
				if (!computedStyle[d.property]) {
					computedStyle[d.property] = {}
				}
				if (!computedStyle[d.property].specificity) {
					computedStyle[d.property].value = d.value
					computedStyle[d.property].specificity = sp
				} else if (compare(computedStyle[d.property].specificity, sp) < 0) {
					computedStyle[d.property].value = d.value
					computedStyle[d.property].specificity = sp
				}
			}
			console.log(computedStyle)
		}
	}
}

function compare(sp1, sp2) {
	if (sp1[0] - sp2[0]) return sp1[0] - sp2[0]
	if (sp1[1] - sp2[1]) return sp1[1] - sp2[1]
	if (sp1[2] - sp2[2]) return sp1[2] - sp2[2]
	return sp1[3] - sp2[3]
}

// 选择器优先级
function specificity(selector) {
	const p = [0, 0, 0, 0]
	const selectorParts = selector.split(' ')
	for (const s of selectorParts) {
		if (p.charAt(0) === '#') p[1] += 1
		else if (p.charAt(0) === '.') p[2] += 1
		else p[3] += 1
	}
	return p
}

function match(elem, selector) {
	if (!selector || !elem.attributes) return false

	if (selector.charAt(0) === '#') {
		const attr = elem.attributes.filter(a => a.name === 'id')
		if (attr && attr.value === selector.replace('#', '')) return true
	} else if (selector.charAt(0) === '.') {
		const attr = elem.attributes.filter(a => a.name === 'class')
		if (attr && attr.value === selector.replace('.', '')) return true
	} else {
		if (elem.tagName === selector) return true
	}
}

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
	return stack
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

		// css规则的计算是在元素ast生成的时候就同步进行
		computeCSS(element)

		top.children.push(element)
		element.parent = top

		// 自封闭标签入栈后马上出栈，所以不用处理
		if (!token.isSelfClosing) {
			stack.push(element)
		}
		currentTextNode = null
	} else if (token.type === 'endTag') {
		if (top.tagName !== token.tagName) {
			// throw new Error("tag start end doesn't match")
		} else {
			if (top.tagName === 'style') {
				addCSSRules(top.children[0].content)
			}
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
		currentAttribute.name += s
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
		emit(currentToken)
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
