export const splitter = (str) => {
	let n = 0, left = [], right = []
	for (let s in str) {
		if (n >= 5) {
			right.push(str[s])
			n++
			continue
		}
		left.push(str[s])
		n++
	}
	return { left, right }
}