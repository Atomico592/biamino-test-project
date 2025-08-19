import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import bs58 from 'bs58';
import 'dotenv/config';
import axios from "axios";

const USDT_ADRES = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
const SOL_ADRES = new PublicKey('So11111111111111111111111111111111111111112');
const url = 'https://lite-api.jup.ag/swap/v1'
const connection = new Connection(process.env.RPC_SOL_URL, {
    commitment: 'confirmed',
});

const secretKey = bs58.decode(process.env.WALLET_SOL_KEY);
const wallet = Keypair.fromSecretKey(secretKey);

const toAtomic = (amount, decimal) => {
    const [int, frac = ''] = String(amount).split('.');
    const fracPadded = (frac + '0'.repeat(decimal)).slice(0, decimal);
    return BigInt(int + fracPadded);
};

const getQuote = async ({ inputMint, outputMint, amount }) => {
    try {
        const res = await axios.get(`${url}/quote
`, {
            params: {
                inputMint: inputMint.toString(),
                outputMint: outputMint.toString(),
                slippageBps: 50,
                amount,
                restrictIntermediateTokens: true
            }
        });
        console.log(res.data)
        return res.data;
    } catch (e) {
        console.error('Ошибка getQuote:', e.response?.data || e.message);
    }
};

const buildSwapTx = async ({ quoteResponse }) => {

    const body = {
        userPublicKey: wallet.publicKey.toBase58(),
        quoteResponse,
        dynamicComputeUnitLimit: true,
        dynamicSlippage: true,
        prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
                maxLamports: 1000000,
                global: false,
                priorityLevel: 'veryHigh',
            },
        },
    };
    try {
        const res = await axios.post(
            `${url}/swap`,
            body,
            { headers: { 'Content-Type': 'application/json' } }
        );
        return res.data.swapTransaction;
    } catch (e) {
        console.error('Ошибка buildSwapTx:', e.response?.data || e.message);
    }
};

const signSendConfirm = async (base64Tx) => {
    const tx = VersionedTransaction.deserialize(Buffer.from(base64Tx, 'base64'));
    tx.sign([wallet]);
    const raw = tx.serialize();
    const signature = await connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 2 });
    console.log(`https://solscan.io/tx/${signature}`)
    const conf = await connection.confirmTransaction({ signature }, 'finalized');
    if (conf.value && conf.value.err) {
        throw new Error(`Tx failed: ${JSON.stringify(conf.value.err)}\nhttps://solscan.io/tx/${signature}`);
    }
    return `https://solscan.io/tx/${signature}`;
};

const currencyExchange = async ({ inputMint, outputMint, humanAmount, decimal }) => {
    const amount = toAtomic(humanAmount, decimal);
    const quoteResponse = await getQuote({ inputMint, outputMint, amount });
    if (!quoteResponse) return console.error('Не удалось получить квоту');
    const swapTx = await buildSwapTx({ quoteResponse });
    const signature = await signSendConfirm(swapTx);
    return signature;
};

const runTx = async () => {
    try {
        const sig1 = await currencyExchange({
            inputMint: USDT_ADRES,
            outputMint: SOL_ADRES,
            humanAmount: 1,
            decimal: 6,
        });

        console.log('USDT -> SOL:', sig1);

        const sig2 = await currencyExchange({
            inputMint: SOL_ADRES,
            outputMint: USDT_ADRES,
            humanAmount: 0.01,
            decimal: 9,
        });
        console.log('SOL -> USDT:', sig2);

    } catch (err) {
        console.error(err);
    }
}

runTx();