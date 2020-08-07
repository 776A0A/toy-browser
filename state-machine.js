function match(str) {
	let state = start
	for (const s of str) {
		state = state(s)
		if (state === end) break
	}
	return state === end
}

function start(s) {
	if (s === 'a') return foundA
	return start
}
function foundA(s) {
	if (s === 'b') return foundB
	return start(s) // 将输入移到下一个状态
}
function foundB(s) {
	if (s === 'c') return foundC
	return start(s)
}
function foundC(s) {
	if (s === 'a') return foundA2
	return start(s)
}
function foundA2(s) {
	if (s === 'b') return foundB2
	return start(s)
}
function foundB2(s) {
	if (s === 'x') return end
	return foundB(s)
}

function end() {
	return end
}

const str = 'abcabcabx'

console.log(match(str))
