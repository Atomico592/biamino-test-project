import express from 'express';
import { exec } from 'child_process';

const app = express();
const port = 8000;

app.listen(port, () => {
    exec('node solana.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return;
        }
        console.log(`Результат:\n${stdout}`);
    });
});