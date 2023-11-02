import express from 'express'
import EVM from '../services/evm.js'
import { findTxs } from '../services/db.js'
import { splitter } from './util.js'
import chains from '../config.js'

const router = express.Router()
let evms = new Map()

// Setting up chain config and EVM instance
chains.forEach((chain) => {
	let instance = new EVM(chain)
	evms.set(chain.ID, {
		config: chain,
		instance: instance,
	})
})

// [/drip] post request for send token
router.post('/drip', async (req, res) => {
	const address = req.body.address
	const tweet = req.body.tweet
	const chain = req.body.chain

	const evm = evms.get(chain)
	if(evm) {
		evm.instance.sendTX(address, tweet, (data) => {
			const { status, message, txHash } = data
			res.send({status, message, txHash})
		})
	} else {
		res.send({
			status: 400,
			message: "Invalid chains passed!"
		})
	}
})

// [/txs] show the last 10 tx history
// data are separate into two array
router.get('/txs', async (req, res) => {
	let txs = await findTxs()

	if (txs === undefined) {
		res.send({
			status: 400,
			message: "Cannot get tx history!"
		})
		return
	}

	// split data
	let { left, right } = splitter(txs)
	res.send({left, right})
})

export default router