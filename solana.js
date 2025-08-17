import {Connection, Keypair, PublicKey} from "@solana/web3.js";
import bs58 from 'bs58';
import 'dotenv/config';

const USDT_ADRES = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
const SOL_ADRES = new PublicKey('So11111111111111111111111111111111111111111');

const connection = new Connection(process.env.RPC_URL, { commitment: 'confirmed' });
const wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_KEY));


