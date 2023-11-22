import express from 'express'
import EVM from '../services/evm.js'
import { findTxs, newTicket } from '../services/db.js'
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
	const address = req.body?.address
	const tweet = req.body?.tweet
	const text = req.body?.text
	const chain = req.body?.chain

	const evm = evms.get(chain)
	if(evm) {
		evm.instance.sendTX(address, tweet, text, (data) => {
			const { status, message, txHash } = data
			res.send({status, message, txHash})
		})
	} else {
		res.send({
			status: 400,
			message: "Invalid chain passed!"
		})
	}
})

// [/txs] show the last 10 tx history
// data are separate into two array
router.get('/txs', async (req, res) => {
	let txs = await findTxs()

	if (!txs) {
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

// [/support] post request for submit ticket
router.post('/support', async (req, res) => {
	const email = req.body?.email
	const message = req.body?.message

	let ticket = await newTicket({
		email: email,
		message: message,
	})

	if (ticket) {
		res.send({ message: 'Success to submiting ticket'})
	} else {
		res.send({ message: 'Failed to submiting ticket'})
	}
})


export default router