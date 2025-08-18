import { AptosAccount, AptosClient } from 'aptos';
import pkg from '@pontem/liquidswap-sdk';
const { SDK, convertValueToRaw } = pkg;
import 'dotenv/config';

const RPC_APT_URL = process.env.RPC_APT_URL;
const client = new AptosClient(RPC_APT_URL);

const WALLET_ACCOUNT = new AptosAccount(
    Buffer.from(process.env.WALLET_KEY_APTOS, 'hex')
);

const APT = '0x1::aptos_coin::AptosCoin';
const USDT = '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58339a90a3c6f0f26::asset::USDT';

const swapSdk = new SDK({ nodeUrl: RPC_APT_URL });

const ensureCoinStore = async (typeTag) => {
    // try {
        await client.getAccountResource(
            WALLET_ACCOUNT.address().hex(),
            `0x1::coin::CoinStore<${typeTag}>`
        );
    // } catch {
        const payload = {
            type: 'entry_function_payload',
            function: '0x1::coin::register',
            type_arguments: [typeTag],
            arguments: [],
        };
        const tx = await client.signAndSubmitTransaction(WALLET_ACCOUNT, payload);
        await client.waitForTransaction(tx.hash);
        console.log(`CoinStore зарегистрирован: ${typeTag}`);
    // }
};

const swapTokens = async (
    fromToken,
    toToken,
    amount
) => {
    try {
        const decimals = fromToken === USDT ? 6 : 8;
        const amountRaw = convertValueToRaw(amount, decimals);
        const quote = await swapSdk.Swap.calculateRates({
            fromToken,
            toToken,
            amount: amountRaw,
            curveType: 'uncorrelated',
            interactiveToken: 'from',
            version: 0,
        });
        console.log(quote.outputAmount, "dasdasd");

        const txPayload = swapSdk.Swap.createSwapTransactionPayload({
            fromToken,
            toToken,
            fromAmount: amountRaw,
            toAmount: quote.outputAmount,
            interactiveToken: 'from',
            slippage: 0.005,
            curveType: 'uncorrelated',
            version: 0,
        });

        const res = await client.signAndSubmitTransaction(WALLET_ACCOUNT, txPayload);
        await client.waitForTransaction(res.hash);
        console.log(`https://explorer.aptoslabs.com/txn/${res.hash}`);
    } catch (err) {
        console.error('Ошибка свапа:', err.message || err);
    }
};

const run = async () => {
    await ensureCoinStore(APT);
    await ensureCoinStore(USDT);
    // 1 USDT → APT
    await swapTokens(USDT, APT, 1);

    // 0.1 APT → USDT
    // await swapTokens(APT, USDT, 0.1);
};

run();
