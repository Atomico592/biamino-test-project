import {Connection, Keypair, PublicKey, VersionedTransaction} from "@solana/web3.js";
import bs58 from 'bs58';
import 'dotenv/config';
import axios from "axios";

const USDT_ADRES = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
const SOL_ADRES = new PublicKey('So11111111111111111111111111111111111111112');

const connection = new Connection(process.env.RPC_URL, { commitment: 'confirmed' });

const wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_KEY));


const toAtomic = (amount, decimal) => {
    const [int, frac = ''] = String(amount).split('.');
    const fracPadded = (frac + '0'.repeat(decimal)).slice(0, decimal);
    return BigInt(int + fracPadded);
};

const  getQuote = async ({ inputMint, outputMint, amount }) => {
    const url = 'https://lite-api.jup.ag/swap/v1/quote';
    try {
        const res = await axios.get(url, {
            params: {
                inputMint: inputMint.toString(),
                outputMint: outputMint.toString(),
                slippageBps: 50,
                amount,
                restrictIntermediateTokens: true
            }
        });
        return res.data;
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
};

const buildSwapTx = async ({ quoteResponse }) => {
    const body = {
        quoteResponse,
        userPublicKey: wallet.publicKey.toBase58(),
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
                maxLamports: 1_000_000,
                global: false,
                priorityLevel: 'veryHigh',
            },
        },
    };

    try {
        const res = await axios.post(
            'https://lite-api.jup.ag/swap/v1/swap',
            body,
            { headers: { 'Content-Type': 'application/json' } }
        );
        return res.data.swapTransaction;
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
};

const signSendConfirm = async (base64Tx) => {
    const tx = VersionedTransaction.deserialize(Buffer.from(base64Tx, 'base64'));
    tx.sign([wallet]);
    const raw = tx.serialize();
    const signature = await connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 2 });
    const conf = await connection.confirmTransaction({ signature }, 'finalized');
    if (conf.value.err) {
        throw new Error(`Tx failed: ${JSON.stringify(conf.value.err)}\nhttps://solscan.io/tx/${signature}`);
    }
    return signature;
}

const currencyExchange = async ({inputMint, outputMint, humanAmount, decimal}) => {
    const amount = toAtomic(humanAmount, decimal);
    const quoteResponse = await getQuote({inputMint, outputMint, amount});
    console.log(quoteResponse)
    if (!quoteResponse) return console.error('Не удалось получить квоту');

    const swapTX = await buildSwapTx({quoteResponse});
    const signature = await signSendConfirm(swapTX);
    return signature;
}

const test = async () => {

    // 1) 1 USDT -> SOL
    const sig1 = await currencyExchange({
        inputMint: USDT_ADRES,
        outputMint: SOL_ADRES,
        humanAmount: 1,
        decimal: 6,
    });

    // 2) 0.01 SOL -> USDT
    const sig2 = await swapOneDirection({
        fromMint: SOL_ADRES,
        toMint: USDT_ADRES,
        humanAmount: 0.1,
        decimals: 9,
    });

    console.log(sig1);
    console.log(sig2);
}

test()

