import {AptosAccount, AptosClient} from 'aptos';
import { SDK, convertValueToDecimal } from '@pontem/liquidswap-sdk';
import 'dotenv/config';

const NODE_URL = process.env.NODE_URL;
const client = new AptosClient(NODE_URL);


const WALLET_ACCOUNT = new AptosAccount(Buffer.from(process.env.WALLET_KEY_APTOS, 'hex'));


const APT = '0x1::aptos_coin::AptosCoin';
const USDT = '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::asset::USDT';

const swapSdk = new SDK({ nodeUrl: NODE_URL });


const swapTokens = async (fromToken, toToken, amount) => {
    try {
        const amountRaw = convertValueToDecimal(amount, fromToken === USDT ? 6 : 8);
        const quote = await swapSdk.Swap.calculateRates({
            fromToken,
            toToken,
            amount: amountRaw,
            curveType: 'uncorrelated',
            interactiveToken: 'from',
            version: 0,
        });
        try {
            await client.getAccountResource(WALLET_ACCOUNT.address().hex(), `0x1::coin::CoinStore<${fromToken}>`);
        } catch {
            throw new Error(`From Coin not exists on your account: ${fromToken}`);
        }

        const txn = await swapSdk.Swap.swapExactTokensForTokens({
            account: WALLET_ACCOUNT,
            fromToken,
            toToken,
            inputAmount: amountRaw,
            minOutputAmount: quote.outputAmount,
            curveType: 'uncorrelated',
            version: 0,
        });

        const txHash = await client.submitSignedBCSTransaction(txn);
        console.log('Ссылка на Aptoscan:', `https://aptoscan.com/transaction/${txHash}`);
    } catch (err) {
        console.error('Ошибка свапа:', err.message || err);
    }
};

const run = async () => {
    // 1 USDT → APT
    await swapTokens(USDT, APT, 1);

    // 0.1 APT → USDT
    // await swapTokens(APT, USDT, 0.1);
}

run()