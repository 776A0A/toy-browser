const { cssRules } = require('./css-parser')

function computeCSS(element, stack) {
	/**
	 * 在匹配css规则的时候，必须得到该元素所有的上级元素，才能判断规则是否匹配
	 * 最先进行匹配的肯定是当前元素，如果当前元素都不匹配，那就不用匹配上级元素了
	 * 所以，css选择器的匹配是从右到左，先匹配具体的，然后匹配上级
	 * 如果在body内写style标签，那么很可能会使得原来的计算得到的css-ast完全无用
	 */
	// 取得所有的上级元素
	const elements = stack.slice().reverse()

	if (!element.computedStyle) element.computedStyle = {}

	for (const rule of cssRules) {
		// 所有的选择器数组
		const selectorParts = rule.selectors[0].split(' ').reverse()

		// selectorParts[0] 就是这个复合选择器下最具体指向的选择器
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
			// rule.declarations获取属性数组
			for (const d of rule.declarations) {
				if (!computedStyle[d.property]) {
					computedStyle[d.property] = {}
				}
				const dData = computedStyle[d.property]
				if (!dData.specificity) {
					dData.value = d.value
					dData.specificity = sp
				}
				// 处理属性可能覆盖的情况，返回负数说明具体的权重值没有新的权重值高
				else if (compare(dData.specificity, sp) < 0) {
					dData.value = d.value
					dData.specificity = sp
				}
			}
			console.log(computedStyle)
		}
	}
}

function compare(sp1, sp2) {
	// 如果都没有，那么就返回0，那么就是false
	if (sp1[0] - sp2[0]) return sp1[0] - sp2[0]
	if (sp1[1] - sp2[1]) return sp1[1] - sp2[1]
	if (sp1[2] - sp2[2]) return sp1[2] - sp2[2]
	return sp1[3] - sp2[3]
}

// 选择器优先级
function specificity(selector) {
	const p = [0, 0, 0, 0] // 给出4个权重级别
	const selectorParts = selector.split(' ')
	for (const s of selectorParts) {
		if (s.charAt(0) === '#') p[1] += 1
		else if (s.charAt(0) === '.') p[2] += 1
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
		else return false
	}
}

module.exports = {
	computeCSS
}
