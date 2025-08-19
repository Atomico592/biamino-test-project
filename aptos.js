import { AptosAccount } from "aptos";
import { SDK, convertValueToDecimal } from "@pontem/liquidswap-sdk";
import "dotenv/config";

const NODE_URL = process.env.RPC_APT_URL;


const APT = "0x1::aptos_coin::CoinInfo<0x1::aptos_coin::AptosCoin>";
const USDT = "0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::CoinInfo<0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T>";

const PRIVATE_KEY_HEX = process.env.WALLET_KEY_APTOS;
const privateKeyBytes = Uint8Array.from(Buffer.from(PRIVATE_KEY_HEX, "hex"));
const account = new AptosAccount(privateKeyBytes);

const sdk = new SDK({ nodeUrl: NODE_URL });

const swapTokens = async (fromToken, toToken, amount, decimals) => {

    const rate = await sdk.Swap.calculateRates({
        fromToken,
        toToken,
        amount: convertValueToDecimal(amount, decimals),
        curveType: "uncorrelated",
        interactiveToken: "from",
        version: 0,
    });

    console.log("Rate:", rate);


    const txPayload = sdk.Swap.createSwapTransactionPayload({
        fromToken,
        toToken,
        fromAmount: convertValueToDecimal(amount, decimals),
        toAmount: rate.toAmount,
        slippage: 0.005,
        curveType: "uncorrelated",
        stableSwapType: "high",
        version: 0,
    });


    const txnRequest = await client.generateTransaction(account.address(), txPayload);
    const signedTxn = await client.signTransaction(account, txnRequest);
    const res = await client.submitTransaction(signedTxn);
    await client.waitForTransaction(res.hash);

    console.log(`https://aptoscan.com/txn/${res.hash}`);
    return res.hash;
};


const runTx = async () => {
    try {
        await swapTokens(USDT, APT, 1, 6);
        await swapTokens(APT, USDT, 0.1, 8);
    } catch (err) {
        console.error(err);
    }
};

runTx();
