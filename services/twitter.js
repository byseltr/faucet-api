import axios from 'axios'

const BLESS_TOKEN = process.env.BLESS_TOKEN
const ACCESS_TOKEN = process.env.ACCESS_TOKEN

const client = axios.create({
	baseURL: 'https://chrome.browserless.io/',
	headers: {
		'Cache-Control': 'no-cache',
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
})

async function isValidTweet(url, content) {
	const scraper = `/scrape?token=${BLESS_TOKEN}`
	const body = {
		"url": url,
		"waitFor": 10000,
		"elements": [
			{ "selector": "meta[property='og:description']" }
		],
		"cookies": [
			{
				name: 'auth_token',
				value: ACCESS_TOKEN,
				domain: 'twitter.com',
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'Strict'
			}
		]
	}

	// post request to browserless api
	const { data: response } = await client.post(scraper, body)
	const attr = response?.data[0]?.results[0]?.attributes

	if (!attr) {
		return { valid: false, msg: 'Invalid tweet url!'}
	}

	const tweet = attr[0]

	if (tweet?.name !== 'content') {
		return { valid: false, msg: 'Cannot validate tweet content!'}
	}

	// validate if tweet content same with content text
	if (tweet?.value !== content) {
		return { valid: false, msg: 'Invalid tweet content!'}
	}

	// is valid tweet content
	return { valid: true, msg: 'Tweet content is VALID'}
}

export default isValidTweet