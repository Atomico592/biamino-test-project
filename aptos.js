// aptos_swap_auto_faucet.ts
import { AptosAccount, AptosClient, TxnBuilderTypes } from "aptos";
import pkg from "@pontem/liquidswap-sdk";
const { SDK, convertValueToRaw } = pkg;
import axios from "axios";
import "dotenv/config";

// ---------- ENV ----------
const RPC_URL = process.env.RPC_APT_URL || "https://fullnode.testnet.aptoslabs.com/v1";
const FAUCET_URL = "https://faucet.testnet.aptoslabs.com";
let RAW_PK = (process.env.WALLET_KEY_APTOS || "").replace(/^0x/, "");
if (!RAW_PK || RAW_PK.length !== 64) throw new Error("WALLET_KEY_APTOS должен быть 64 символа hex.");

const client = new AptosClient(RPC_URL);
const WALLET_ACCOUNT = new AptosAccount(Buffer.from(RAW_PK, "hex"));

const APT = "0x1::aptos_coin::AptosCoin";
const USDT = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58339a90a3c6f0f26::asset::USDT";
const swapSdk = new SDK({ nodeUrl: RPC_URL });

// ---------- HELPERS ----------
async function getCoinStore(address, typeTag) {
    try {
        const url = `${RPC_URL}/accounts/${address}/resource/${encodeURIComponent(
            `0x1::coin::CoinStore<${typeTag}>`
        )}`;
        const res = await axios.get(url);
        return Number(res.data.data?.coin?.value || 0);
    } catch (err) {
        if (err.response?.status === 404) return null;
        throw err;
    }
}

async function fundFromFaucet(address, amount = 100_000_000) {
    console.log(`💧 Пополняем ${amount / 1e8} APT через faucet...`);
    const res = await axios.post(`${FAUCET_URL}/mint`, { address, amount });
    console.log("Faucet response:", res.data);
    // Ждем несколько секунд, чтобы сеть обновила баланс
    await new Promise((r) => setTimeout(r, 5000));
}

async function ensureCoinStore(typeTag) {
    const balance = await getCoinStore(WALLET_ACCOUNT.address().hex(), typeTag);
    if (balance !== null) {
        console.log(`✅ CoinStore уже существует: ${typeTag}`);
        return;
    }

    // Проверяем APT для газа
    let aptBalance = await getCoinStore(WALLET_ACCOUNT.address().hex(), APT);
    if (!aptBalance || aptBalance === 0) {
        console.log("❌ Недостаточно APT для газа, используем faucet...");
        await fundFromFaucet(WALLET_ACCOUNT.address().hex(), 1_000_000_000);
        aptBalance = await getCoinStore(WALLET_ACCOUNT.address().hex(), APT);
        if (!aptBalance || aptBalance === 0) throw new Error("Faucet не зафандил APT.");
    }

    console.log(`⚡ CoinStore не найден, регистрирую: ${typeTag}`);

    const entryFuncPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
        TxnBuilderTypes.EntryFunction.natural(
            "0x1::coin",
            "register",
            [new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString(typeTag))],
            []
        )
    );

    const [acct, chainId] = await Promise.all([
        client.getAccount(WALLET_ACCOUNT.address()),
        client.getChainId(),
    ]);

    const rawTxn = new TxnBuilderTypes.RawTransaction(
        TxnBuilderTypes.AccountAddress.fromHex(WALLET_ACCOUNT.address()),
        BigInt(acct.sequence_number),
        entryFuncPayload,
        BigInt(200_000),
        BigInt(100),
        BigInt(Math.floor(Date.now() / 1000) + 600),
        new TxnBuilderTypes.ChainId(chainId)
    );

    const bcsTxn = AptosClient.generateBCSTransaction(WALLET_ACCOUNT, rawTxn);
    const txRes = await client.submitSignedBCSTransaction(bcsTxn);
    await client.waitForTransaction(txRes.hash, { checkSuccess: true });
    console.log(`✅ CoinStore зарегистрирован: ${typeTag} — txHash: ${txRes.hash}`);
}

async function swapTokens(fromToken, toToken, amount) {
    try {
        const decimals = fromToken === USDT ? 6 : 8;
        const amountRaw = convertValueToRaw(amount, decimals);

        const quote = await swapSdk.Swap.calculateRates({
            fromToken,
            toToken,
            amount: amountRaw,
            curveType: "uncorrelated",
            interactiveToken: "from",
            version: 0,
        });

        console.log(`💡 Quote: ${amount} (${amountRaw} raw) ${fromToken} → ~${quote.outputAmount} raw ${toToken}`);

        const txPayload = swapSdk.Swap.createSwapTransactionPayload({
            fromToken,
            toToken,
            fromAmount: amountRaw,
            toAmount: quote.outputAmount,
            interactiveToken: "from",
            slippage: 0.005,
            curveType: "uncorrelated",
            version: 0,
        });

        const [modAddr, modName, funcName] = txPayload.function.split("::");
        const typeTags = txPayload.type_arguments.map((t) =>
            new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString(t))
        );

        const entryFuncPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
            TxnBuilderTypes.EntryFunction.natural(`${modAddr}::${modName}`, funcName, typeTags, txPayload.arguments)
        );

        const [acct, chainId] = await Promise.all([
            client.getAccount(WALLET_ACCOUNT.address()),
            client.getChainId(),
        ]);

        const rawTxn = new TxnBuilderTypes.RawTransaction(
            TxnBuilderTypes.AccountAddress.fromHex(WALLET_ACCOUNT.address()),
            BigInt(acct.sequence_number),
            entryFuncPayload,
            BigInt(200_000),
            BigInt(100),
            BigInt(Math.floor(Date.now() / 1000) + 600),
            new TxnBuilderTypes.ChainId(chainId)
        );

        const bcsTxn = AptosClient.generateBCSTransaction(WALLET_ACCOUNT, rawTxn);
        const txRes = await client.submitSignedBCSTransaction(bcsTxn);
        await client.waitForTransaction(txRes.hash, { checkSuccess: true });

        console.log(`✅ Swap успешно! https://explorer.aptoslabs.com/txn/${txRes.hash}`);
    } catch (err) {
        console.error("❌ Ошибка свапа:", err?.message || err);
    }
}

// ---------- RUN ----------
(async function run() {
    console.log(`🚀 Адрес кошелька: ${WALLET_ACCOUNT.address().hex()}`);
    console.log(`🔗 RPC: ${RPC_URL}`);

    await ensureCoinStore(APT);
    await ensureCoinStore(USDT);

    // Свап: 1 USDT → APT
    await swapTokens(USDT, APT, 1);

    // Свап: 0.1 APT → USDT
    // await swapTokens(APT, USDT, 0.1);
})();
