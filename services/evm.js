import Web3 from 'web3'
import { findTweet, newTx } from './db.js'
import isValidTweet from './twitter.js'

const PvK = process.env.PK || ''

export default class EVM {
	constructor(config) {
		this.web3 = new Web3(config.RPC)
		this.account = this.web3.eth.accounts.privateKeyToAccount(PvK)

		this.nonce = -1
		this.hasNonce = false

		this.ID = config.ID
		this.NAME = config.NAME
		this.AMOUNT = this.web3.utils.toWei(config.DRIP_AMOUNT, 'ether')
		this.MAX_PRIORITY_FEE = this.web3.utils.toWei(config.MAX_PRIORITY_FEE, 'gwei')
		this.MAX_FEE = this.web3.utils.toWei(config.MAX_FEE, 'gwei')
		this.EXPLORER = config.EXPLORER

		this.working = false
		this.updateNonce()
	}

	// Processing a new TX Drip from request
	async sendTX(receiver, turl, text, cb) {
		if (this.working) {
			cb({
				status: 400,
				message: 'Waiting job queue! Please try again later',
			})
			return
		}

		// checking updated nonce
		if (this.nonce === -1) {
			cb({
				status: 400,
				message: 'Waiting updated nonce! Please try again',
			})
			return
		}

		// checking is valid address
		if (!this.web3.utils.isAddress(receiver)) {
			cb({
				status: 400,
				message: 'Invalid address! Please try again',
			})
			return
		}

		// validate if tweet url is not empty
		// or length turl is not at least 47 char
		// 47 char is not include `user name`
		// pattern => 'https://twitter.com/user/status/123456789123456789'
		if (!turl || turl.length < 47) {
			cb({
				status: 400,
				message: 'Invalid tweet url! Please try again',
			})
			return
		}

		// validate tweet url is exist or not
		// on database
		const exist = await findTweet(turl)
		if (!exist) {
			cb({
				status: 400,
				message: 'Tweet has been used! Please try again',
			})
			return
		}

		// validate tweet content is same with text content
		// its too validate is valid tweet url
		const tweet = await isValidTweet(turl, text)
		if (!tweet?.valid) {
			cb({
				status: 400,
				message: `${tweet?.msg} Please try again`,
			})
			return
		}

		// indicates state still working
		this.working = true

		if (!this.hasNonce) {
			if (this.nonce === -1) {
				cb({
					status: 400,
					message: 'Something went wrong! Please try again later',
				})
				return
			}
			this.nonce += BigInt(1)
		}

		// processing new transaction
		const amount = this.amount
		const nonce = this.nonce

		const { txHash, error } = await this.newTransaction(receiver, amount, nonce)

		if (txHash) {
			// waiting transaction status
			setTimeout(async () => {
				const tx = await this.web3.eth.getTransactionReceipt(txHash)

				if (tx?.status || tx?.status === 1) {
					const data = await newTx({
						address: receiver,
						chain: this.ID,
						cname: this.NAME,
						tweet: turl,
						explorer: this.EXPLORER,
						hash: txHash,
					})
					console.log('[DB] >>saving tx->', data)
					
					if (this.hasNonce) {
						this.hasNonce = false
					}

					this.working = false
					cb({
						status: 200,
						message: `Transaction success on ${this.NAME}!`,
						txHash,
					})
				} else {
					if (!this.hasNonce) {
						this.hasNonce = true
					}

					this.working = false
					cb({
						status: 400,
						message: `Transaction failed on ${this.NAME}! Please try again`,
					})
				}
			}, 5000)
		} else {
			if (!this.hasNonce) {
				this.hasNonce = true
			}

			this.working = false
			if (error) {
				cb({
					status: 400,
					message: `${error}! Please try again later`,
				})
			} else {
				cb({
					status: 400,
					message: 'Internal server error! Please try again later',
				})
			}
		}
		//END OF STATE
	}

	// Updating incoming nonce
	async updateNonce() {
		try {
			this.nonce = await this.web3.eth.getTransactionCount(this.account.address, 'latest')
			this.hasNonce = true
			console.log("success updating nonce!")
		} catch(err) {
			console.log("failed updating nonce!")
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
			const error = err?.message
			return { error }
		}

		const txHash = signedTx?.transactionHash
		return { txHash }
	}
}