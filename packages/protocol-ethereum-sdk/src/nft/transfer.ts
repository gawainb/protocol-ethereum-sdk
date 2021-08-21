import {
	Address,
	Binary,
	Erc1155AssetType,
	Erc721AssetType,
	NftItemControllerApi,
	NftOwnershipControllerApi,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { toAddress } from "@rarible/types/build/address"
import { toBn } from "../common/to-bn"
import { NftAssetType } from "../order/check-asset-type"
import { transferErc721 } from "./transfer-erc721"
import { transferErc1155 } from "./transfer-erc1155"
import { SimpleLazyNft } from "./sign-nft"
import { transferNftLazy } from "./transfer-nft-lazy"
import { getOwnershipId } from "../common/get-ownership-id"

export type TransferAsset = NftAssetType | Erc721AssetType | Erc1155AssetType

export async function transfer(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftItemApi: NftItemControllerApi,
	nftOwnershipApi: NftOwnershipControllerApi,
	asset: TransferAsset,
	to: Address,
	amount?: BigNumber,
): Promise<string | undefined> {
	const from = toAddress(await ethereum.getFrom())
	const ownership = await nftOwnershipApi.getNftOwnershipByIdRaw({
		ownershipId: getOwnershipId(asset.contract, asset.tokenId, from),
	})
	if (ownership.status === 200) {
		if (toBn(ownership.value.lazyValue).gt(0)) {
			return await transferNftLazy(ethereum, signNft, nftItemApi, nftOwnershipApi, asset, toAddress(from), to, amount)
		} else {
			if ("assetClass" in asset) {
				switch (asset["assetClass"]) {
					case "ERC721": {
						return transferErc721(ethereum, asset.contract, from, to, asset.tokenId)
					}
					case "ERC1155": {
						if (amount) {
							return transferErc1155(ethereum, asset.contract, from, to, asset.tokenId, amount)
						} else {
							throw new Error("Amount is undefined or null")
						}
					}
				}
			} else {
				throw new Error("You have not passed the assetClass for the not lazy NFT item")
			}
		}
	} else {
		throw new Error(`Address ${from} has not any ownerships of token with Id ${asset.tokenId}`)
	}
	return undefined
}

