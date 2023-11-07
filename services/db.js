import { MongoClient, ServerApiVersion } from 'mongodb'

const URI = process.env.MONGO_URI || ''

const connect = async () => {
	const client = new MongoClient(URI, {
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true,
		},
	})

	let conn
	try {
		conn = await client.connect()
		console.log("[DB] connected to database...")
	} catch(err) {
		console.error(err)
		return 
	}

	let db = await conn.db('byseltr_faucet_test')
	return db
}

let db = await connect()
let txs = await db.collection('txs')

// findTxs are find the last 10 transaction.
export const findTxs = async () => {
	let lists = await txs.find({})
		.sort({_id:-1})
		.limit(10)
		.toArray()

	if (lists.length !== 10) {
		// err: can't get txs
		return undefined
	}
	return lists
}

// findTweet are find tx order by `tweet url`.
export const findTweet = async (url) => {
	let result = await txs.find({"tweet":url})
		.toArray()

	if (result.length !== 0) {
		// err: tweet has used
		return false
	}
	return true
}

// newTx are create and insert new transaction.
export const newTx = async (drip) => {
	// validate data before insert
	drip.time = new Date()
	let result = await txs.insertOne(drip)
	return result
}

// newTicket are create and insert new ticket
export const newTicket = async (ticket) => {
	const tickets = await db.collection('tickets')

	ticket.time = new Date()
	let result = await tickets.insertOne(ticket)
	return result
}