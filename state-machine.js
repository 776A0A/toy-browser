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
	return start
}
function foundB(s) {
	if (s === 'c') return end
	return start
}

function end() {
	return end
}

const str = 'joagoejadabcafef'

console.log(match(str))
