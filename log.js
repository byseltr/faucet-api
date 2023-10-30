class log {
	constructor(req, res) {
		this.req = req
		this.res = res
		this.time = new Date()

		this.method = this.req.method
		this.pattern = this.req.url
		this.status = this.res.statusCode
		this.message = this.res.send.message || ''

		this.print()
		this.response()
	}
	print() {
		const date = this.date()
		const status = this.status
		const method = this.method
		const path = this.req.url
		const sep = (str) => {return this.color(str)}

		console.log(sep("[BFA]"),date,sep('| '),status,sep(' | '), method,'\t ', path)
	}

	response() {
		const date = this.date()
		const message = this.message

		console.log('[DATA]',date,'|| msg:',message)
	}

	date() {
		let time = this.time
		let year = time.getFullYear()
		let month = String(time.getMonth()).padStart(2, '0')
		let day = String(time.getDate()).padStart(2, '0')
		let hour = String(time.getHours()).padStart(2, '0')
		let minute = String(time.getMinutes()).padStart(2, '0')
		let second = String(time.getSeconds()).padStart(2, '0')
		const s = '/', c = ':'
		return year+s+month+s+day+" - "+hour+c+minute+c+second
	}

	color(str) {
		const reset = '\x1b[0m'
		const cyan = '\x1b[36m'
		return cyan+str+reset
	}
}

function logger(req, res, next) {
	new log(req, res)

	next()
}

export default logger