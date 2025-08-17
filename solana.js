import {Connection, Keypair, PublicKey} from "@solana/web3.js";
import bs58 from 'bs58';
import 'dotenv/config';
import axios from "axios";

const USDT_ADRES = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
const SOL_ADRES = new PublicKey('So11111111111111111111111111111111111111112');

const connection = new Connection(process.env.RPC_URL, { commitment: 'confirmed' });
const wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_KEY));


const toAtomic = (amount, decimals) => {
    const [int, frac = ''] = String(amount).split('.');
    const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
    return BigInt(int + fracPadded);
};

const  getQuote = async ({ inputMint, outputMint, atomicAmount }) => {
    const url = 'https://lite-api.jup.ag/swap/v1/quote';
    try {
        const res = await axios.get(url, {
            params: {
                inputMint: inputMint.toString(),
                outputMint: outputMint.toString(),
                slippageBps: 50,
                amount: atomicAmount,
                restrictIntermediateTokens: true
            }
        });
        return res.data;
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}

const quote = await getQuote({
    inputMint: USDT_ADRES,
    outputMint:  SOL_ADRES,
    atomicAmount: toAtomic(1, 9)
});



