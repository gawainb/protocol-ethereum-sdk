import Web3ProviderEngine from "web3-provider-engine"
import Wallet from "ethereumjs-wallet"
import { TestSubprovider } from "@rarible/test-provider"
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { randomWord } from "@rarible/types"

export function createE2eWallet(pk: string = randomWord()): Wallet {
	return new Wallet(Buffer.from(fixPK(pk), "hex"))
}

export function createE2eProvider(pk: string = randomWord()) {
	const provider = new Web3ProviderEngine({ pollingInterval: 100 })
	const wallet = createE2eWallet(pk)
	provider.addProvider(new TestSubprovider(wallet, { networkId: 17, chainId: 17 }))
	provider.addProvider(new RpcSubprovider({ rpcUrl: "https://node-e2e.rarible.com" }))

	beforeAll(() => provider.start())
	afterAll(() => provider.stop())

	return {
		provider,
		wallet,
	}
}

function fixPK(pk: string) {
	return pk.startsWith("0x") ? pk.substring(2) : pk
}
