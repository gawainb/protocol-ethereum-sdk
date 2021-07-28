import {BigNumber, OrderForm, OrderRaribleV2DataV1} from "@rarible/protocol-api-client";
import {Address, toBigNumber, toAddress} from "@rarible/types";
import {sentTx} from "../common/send-transaction";
import Web3 from "web3";
import {createExchangeV2Contract} from "./contracts/exchange-v2";
import {
    getErc20TransferProxyAddress,
    getExhangeV2Address,
    getRoyaltiesProviderAddress,
    getTransferProxyAddress
} from "./addresses";
import {createRoyaltiesProviderContract} from "./contracts/royalties-provider";
import {orderToStruct, signOrder} from "./sign-order";

const protocolCommission = toBigNumber('0')

export type OrderMaker = {
    maker: Address,
    amount: BigNumber,
    payouts: [],
    originFees: [],
}

export async function matchOrders(
    web3: Web3,
    contract: Address,
    orderLeft: OrderForm,
    form: OrderMaker
): Promise<string | undefined> {
    switch (orderLeft.type) {
        // case 'RARIBLE_V1': {
        //     return (() => '')();
        // }
        case 'RARIBLE_V2': {
            return await prepareTxFor2Orders(
                web3,
                contract,
                orderLeft,
                form
            )
        }
    }
    return undefined
}

async function prepareTxFor2Orders(
    web3: Web3,
    contract: Address,
    order: OrderForm,
    form: OrderMaker,
): Promise<string | undefined> {
    const exchangeContract = createExchangeV2Contract(web3, contract)
    const orderRight = {
        ...invert(order, form.maker),
        data: {
            ...order.data,
            payouts: [], // todo
            originFees: []// todo get from PrepareOrderTxFormDto?
        }
    }
    const exchangeContractAddress = exchangeContract.options.address
    const fee = (orderRight.data as OrderRaribleV2DataV1).originFees.reduce((r,c) => r+c.value, 0) + protocolCommission
    const orderSign = await signOrder(web3, form.maker, order, contract)
    const orderRightSign = await signOrder(web3, form.maker, orderRight, contract)
    const [address, address2] = await web3.eth.getAccounts()
    console.log('orderSign', orderSign.signature);
    console.log('orderRightSign', orderRightSign.signature);
    return await sentTx(
        exchangeContract.methods.matchOrders(
            orderToStruct(order),
            orderSign.signature,
            orderToStruct(orderRight),
            orderRightSign.signature
        ),
        {from: toAddress(address)}
    )
}

export const invert = (orderLeft: OrderForm, maker: Address): OrderForm => {
    return {
        ...orderLeft,
        make: orderLeft.take,
        take: orderLeft.make,
        maker,
    }
}
