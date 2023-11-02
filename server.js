import express from 'express'
import cors from 'cors'
import corsOptions from './middlewares/cors.js'
import bodyParser from 'body-parser'
import router from './api/index.js'
// import logger from './log.js'
import './loadENV.js'

const port = process.env.PORT || 5000
const server = express()

server.use(cors(corsOptions))
// server.use(bodyParser.urlencoded({ extended: false }))
server.use(bodyParser.json())

// server.use(logger)
server.use('/api', router)

server.get('/ip', (req, res) => {
	res.send({
		ip: req.headers["cf-connecting-ip"] || req.ip
	})
})

server.get('/status', (req, res) => {
	res.send('server working')
})

server.get('*', (req, res) => {
	res.send('page not found!')
})

// running server
server.listen(port, () => {
	console.log(`[SERVER] running on port ${port}`)
	console.log('[SERVER] developed by Andrew Setyawan')
})