import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { toAddress, toBigNumber } from "@rarible/types"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/ethereum-api-client"
import { toBn } from "@rarible/utils"
import type { Ethereum } from "@rarible/ethereum-provider"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { createTestProviders } from "../common/create-test-providers"
import {
	createErc1155V1Collection,
	createErc1155V2Collection,
	createErc721V2Collection,
	createErc721V3Collection,
} from "../common/mint"
import { createEthereumApis } from "../common/apis"
import type { ERC1155RequestV1, ERC721RequestV2, ERC721RequestV3, ERC1155RequestV2} from "./mint"
import { mint as mintTemplate } from "./mint"
import { signNft } from "./sign-nft"
import { burn as burnTemplate } from "./burn"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc721Contract } from "./contracts/erc721"
import { getErc1155Contract } from "./contracts/erc1155"

const { provider, wallet } = createE2eProvider()
const { providers } = createTestProviders(provider, wallet)

describe.each(providers)("burn nfts", (ethereum: Ethereum) => {
	const testAddress = toAddress(wallet.getAddressString())
	const configuration = new Configuration(getApiConfig("e2e"))
	const apis = createEthereumApis("e2e")
	const collectionApi = new NftCollectionControllerApi(configuration)
	const mintLazyApi = new NftLazyMintControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const sign = signNft.bind(null, ethereum, 17)
	const send = sendTemplate.bind(ethereum, gatewayApi)
	const checkAssetType = checkAssetTypeTemplate.bind(null, collectionApi)
	const mint = mintTemplate.bind(null, ethereum, send, sign, collectionApi)
	const burn = burnTemplate.bind(null, ethereum, send, checkAssetType, apis)
	const contractErc721 = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
	const contractErc1155 = toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1")

	const e2eErc721V3ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
	const e2eErc1155V2ContractAddress = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")

	test("should burn ERC-721 v2 token", async () => {
		const testErc721 = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, contractErc721)
		const minted = await mint(mintLazyApi, {
			collection: createErc721V2Collection(contractErc721),
			uri: "ipfs://ipfs/hash",
			royalties: [],
		} as ERC721RequestV2)
		const testBalance = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(toBn(testBalance).toString()).toBe("1")

		await burn({
			contract: contractErc721,
			tokenId: minted.tokenId,
		})
		const testBalanceAfterBurn = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(toBn(testBalanceAfterBurn).toString()).toBe("0")
	})

	test("should burn ERC-1155 v1 token", async () => {
		const testErc1155 = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V1, contractErc1155)
		const minted = await mint(mintLazyApi, {
			collection: createErc1155V1Collection(contractErc1155),
			uri: "ipfs://ipfs/hash",
			royalties: [],
			supply: 100,
		} as ERC1155RequestV1)
		await burn({
			contract: contractErc1155,
			tokenId: minted.tokenId,
		}, toBigNumber("50"))

		const testBalanceAfterBurn = await testErc1155.functionCall("balanceOf", testAddress, minted.tokenId).call()
		expect(toBn(testBalanceAfterBurn).toString()).toBe("50")
	})

	test("should burn ERC-721 v3 lazy", async () => {
		const minted = await mint(mintLazyApi, {
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "ipfs://ipfs/hash",
			creators: [{ account: toAddress(testAddress), value: 10000 }],
			royalties: [],
			lazy: true,
		} as ERC721RequestV3)
		await burn({
			contract: e2eErc721V3ContractAddress,
			tokenId: minted.tokenId,
		})
	})

	test("should burn ERC-1155 v2 lazy", async () => {
		const minted = await mint(mintLazyApi, {
			collection: createErc1155V2Collection(e2eErc1155V2ContractAddress),
			uri: "ipfs://ipfs/hash",
			supply: 100,
			creators: [{ account: toAddress(testAddress), value: 10000 }],
			royalties: [],
			lazy: true,
		} as ERC1155RequestV2)
		await burn({
			contract: e2eErc1155V2ContractAddress,
			tokenId: minted.tokenId,
		})
	})
})
