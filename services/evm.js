import Web3 from 'web3'
import { findTweet, newTx } from './db.js'

const PvK = process.env.PK || ''

export default class EVM {
	constructor(config) {
		this.web3 = new Web3(config.RPC)
		this.account = this.web3.eth.accounts.privateKeyToAccount(PvK)

		this.nonce = -1
		this.hasNonce = 0

		this.ID = config.ID
		this.NAME = config.NAME
		this.AMOUNT = this.web3.utils.toWei(config.DRIP_AMOUNT, 'ether')
		this.MAX_PRIORITY_FEE = this.web3.utils.toWei(config.MAX_PRIORITY_FEE, 'gwei')
		this.MAX_FEE = this.web3.utils.toWei(config.MAX_FEE, 'gwei')
		this.EXPLORER = config.EXPLORER

		this.working = false
		this.updateNonce()

		setTimeout(() => {
			console.log("[EVM ENGINE] starting faucet drips...")
		}, 4000)
	}

	// Processing a new TX from request
	async sendTX(receiver, turl, cb) {
		if (this.working) {
			console.log("Faucet is getting working! Please try again,")
			cb({
				status: 400,
				message: 'Faucet is getting working! Please try again',
			})
			return
		}

		if (!this.web3.utils.isAddress(receiver)) {
			console.log("Invalid address! Please try again.")
			cb({
				status: 400,
				message: 'Invalid address! Please try again',
			})
			return
		}

		if (turl === undefined || turl === null) {
			console.log('Invalid tweet url! Please try again.')
			cb({
				status: 400,
				message: 'Invalid tweet url! Please try again.',
			})
			return
		}

		let ct = await findTweet(turl)
		if (!ct) {
			console.log("Tweet has been used! Please try again.")
			cb({
				status: 400,
				message: 'Tweet has used! Please try again',
			})
			return
		}

		// indicates this function on the going work
		this.working = true

		const amount = this.AMOUNT

		// checking prev and curr nonce are same
		if (this.nonce === this.hasNonce) {
			this.nonce = this.hasNonce + BigInt(1)
		}

		// waiting nonce for new transaction
		const WaitingNonce = setInterval(async () => {
			if (this.nonce !== -1) {
				clearInterval(WaitingNonce)

				const nonce = this.nonce
				this.hasNonce = nonce

				const { txHash } = await this.newTransaction(receiver, amount, nonce)
				
				this.working = false

				if (txHash) {
					// initialize data oobject
					let data = {
						address: receiver,
						chain: this.ID,
						tweet: turl,
						explorer: this.EXPLORER,
						hash: txHash,
					}

					const res = await newTx(data)
					console.log("[DB] >>saving=>", res)
					cb({
						status: 200,
						message: `Transaction successful on ${this.NAME}!`,
						txHash,
					})
				} else {
					cb({
						status: 400,
						message: `Transaction failed on ${this.NAME}!`,
					})
				}
			} else if (this.nonce === -1) {
				clearInterval(WaitingNonce)

				this.working = false
				cb({
					status: 400,
					message: 'Server is busy! Please try again later'
				})
			} else {
				clearInterval(WaitingNonce)

				this.working = false
				cb({
					status: 400,
					message: 'Something went wrong! Please try again later'
				})
			}
		}, 300)
	}

	// Updating new nonce
	async updateNonce() {
		try {
			this.nonce = await this.web3.eth.getTransactionCount(this.account.address, 'latest')
			console.log("success updating nonce!")
		} catch(err) {
			console.log("failed can't updating nonce!")
		}
	}

	// EIP-1559 TYPE 2 Transaction
	async newTransaction(to, value, nonce) {
		const tx = {
			to: to,
			value: value,
			gasLimit: '21000',
			maxPriorityFeePerGas: this.MAX_PRIORITY_FEE,
			maxFeePerGas: this.MAX_FEE,
			nonce: nonce,
			type: 2,
		}
		
		let signedTx
		try {
			const signTx = await this.account.signTransaction(tx)
			signedTx = await this.web3.eth.sendSignedTransaction(signTx?.rawTransaction)
		} catch(err) {
			console.error(err)
		}

		const txHash = signedTx?.transactionHash
		return { txHash }
	}
}