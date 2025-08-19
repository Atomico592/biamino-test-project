import { AptosClient, AptosAccount, HexString } from 'aptos';
import { SDK } from '@pontem/liquidswap-sdk';
import 'dotenv/config';

const NODE_URL = process.env.RPC_APT_URL;

const PRIVATE_KEY_HEX = process.env.WALLET_KEY_APTOS;

const USDT_TYPE = '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T';
const APT_TYPE = '0x1::aptos_coin::AptosCoin';

const USDT_DECIMALS = 6;
const USDT_AMOUNT = 1;

const APT_DECIMALS = 8;
const APT_AMOUNT = 0.1;

const toUnits = (amount, decimals) => {
    return BigInt(Math.round(Number(amount) * 10 ** decimals));
}

const runTx = async () => {
    const client = new AptosClient(NODE_URL);
    const account = new AptosAccount(new HexString(PRIVATE_KEY_HEX).toUint8Array());
    const sdk = new SDK({ nodeUrl: NODE_URL });

    // 1) USDT -> APT (1 USDT)
    {
        const fromAmount = toUnits(USDT_AMOUNT, USDT_DECIMALS);

        const txPayload = await sdk.Swap.createSwapTransactionPayload({
            fromToken: USDT_TYPE,
            toToken: APT_TYPE,
            fromAmount: fromAmount.toString(),
            slippage: 0.005,
            interactiveToken: 'from',
            curveType: 'uncorrelated',
            version: 0
        });

        const rawTxn = await client.generateTransaction(account.address(), txPayload);
        const signedTxn = await client.signTransaction(account, rawTxn);
        const res = await client.submitTransaction(signedTxn);
        console.log(`https://aptoscan.com/transaction/${res.hash}`);
        await client.waitForTransaction(res.hash);
    }

    // 2) APT -> USDT (0.1 APT)
    {
        const fromAmount = toUnits(APT_AMOUNT, APT_DECIMALS);

        const txPayload = await sdk.Swap.createSwapTransactionPayload({
            fromToken: APT_TYPE,
            toToken: USDT_TYPE,
            fromAmount: fromAmount.toString(),
            slippage: 0.005,
            interactiveToken: 'from',
            curveType: 'uncorrelated',
            version: 0
        });

        const rawTxn = await client.generateTransaction(account.address(), txPayload);
        const signedTxn = await client.signTransaction(account, rawTxn);
        const res = await client.submitTransaction(signedTxn);

        console.log(`https://aptoscan.com/transaction/${res.hash}`);
        await client.waitForTransaction(res.hash);
    }
}

runTx();
