### Документация к файлу `solana.js`

#### Назначение
Скрипт выполняет два последовательных свопа через Jupiter на сети Solana:
1) USDT → SOL на сумму 1 USDT
2) SOL → USDT на сумму 0.01 SOL

По завершении каждого свопа выводится ссылка на транзакцию в `https://solscan.io`.

#### Зависимости
- `Node.js` 18+
- Пакеты: `@solana/web3.js`, `dotenv`, `axios`, `bs58`
- Тип модулей в проекте: `type: "module"` (см. `package.json`)

#### Переменные окружения
Создайте `.env` в корне проекта:
```env
RPC_SOL_URL=...        # RPC-узел сети Solana (HTTP JSON-RPC)
WALLET_SOL_KEY=...     # Приватный ключ кошелька в формате base58 (совместим с bs58)
```

- `RPC_SOL_URL`: валидный RPC для сети Solana (QuickNode, GetBlock, собственный нод и т.п.).
- `WALLET_SOL_KEY`: приватный ключ аккаунта (base58), с достаточным балансом SOL для комиссий.

#### Адреса и используемые ресурсы (сеть Solana)
- `USDT` mint: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` (decimals: 6)
- `wSOL` mint: `So11111111111111111111111111111111111111112` (decimals: 9)
- Jupiter Lite API (base URL): `https://lite-api.jup.ag/swap/v1`
  - `GET /quote` — получение квоты
  - `POST /swap` — построение транзакции свопа (base64)

#### Логика работы
- Инициализация подключения и ключей:
    - `new Connection(RPC_SOL_URL, 'confirmed')`
    - Импорт `Keypair` из `WALLET_SOL_KEY` (через `bs58`)
- Утилита конвертации:
    - `toAtomic(humanAmount, decimals)` — переводит человекочитаемое значение в атомарный `BigInt`
- `getQuote({ inputMint, outputMint, amount })`:
    - Делает `GET /quote` с параметрами:
        - `inputMint`, `outputMint` — mint-адреса (base58)
        - `amount` — атомарная сумма входного токена
        - `slippageBps = 50` (0.5%)
        - `restrictIntermediateTokens = true`
    - Возвращает объект квоты Jupiter
- `buildSwapTx({ quoteResponse })`:
    - Делает `POST /swap` с телом:
        - `userPublicKey` — ваш публичный ключ
        - `quoteResponse` — объект из шага квоты
        - `dynamicComputeUnitLimit: true`, `dynamicSlippage: true`
        - `prioritizationFeeLamports` — лимиты приоритизационной комиссии
    - Возвращает сериализованную транзакцию в `base64`
- `signSendConfirm(base64Tx)`:
    - Десериализует `VersionedTransaction`, подписывает `Keypair`
    - `sendRawTransaction(..., { skipPreflight: true, maxRetries: 2 })`
    - `confirmTransaction(..., 'finalized')`
    - Возвращает URL вида `https://solscan.io/tx/<signature>`
- `currencyExchange({ inputMint, outputMint, humanAmount, decimals })`:
    - Конвертирует сумму, получает квоту, строит и отправляет транзакцию
- `runTx()` выполняет оба свопа по очереди:
    - `USDT → SOL` на `1 USDT` (decimals: 6)
    - `SOL → USDT` на `0.01 SOL` (decimals: 9)

Вывод в консоль: ссылки вида `USDT -> SOL: https://solscan.io/tx/<signature>`.

#### Запуск
- Установите зависимости:
```bash
npm ci
```
- Заполните `.env` (см. выше).
- Запустите скрипт:
```bash
node solana.js
```

#### Настройка под себя
- Суммы и decimals:
    - Меняйте `humanAmount` и соответствующие `decimals` в вызовах `currencyExchange`
- Проскальзывание (анти-слиппедж):
    - Поле `slippageBps` в `getQuote` (по умолчанию 50 = 0.5%). Увеличьте при высокой волатильности или уменьшите для более строгих условий
- Комиссия приоритизации:
    - `prioritizationFeeLamports` в `buildSwapTx`. Увеличение помогает быстрее включать транзакции в блок
- Промежуточные токены:
    - `restrictIntermediateTokens: true` исключает маршруты с множеством хопов. Отключите, если ищете лучшие курсы, но учитывайте риски более длинных маршрутов
- Предпроверка транзакции:
    - `skipPreflight: true` ускоряет отправку, но может скрыть ошибки до фактического включения. Для консервативного режима используйте `false`

#### Безопасность и ограничения
- Никогда не храните приватный ключ в репозитории. Используйте `.env` и секреты CI/CD
- На кошельке должны быть:
    - Достаточно SOL для комиссий и свопов (включая приоритизационную комиссию)
    - Для свопов SPL-токенов — корректные `Associated Token Accounts (ATA)` и достаточный баланс
- RPC должен быть стабильным; допускается HTTP (в коде используется `sendRawTransaction` и `confirmTransaction`)

#### Типичные ошибки
- 403/ошибки Jupiter API:
    - Проверьте URL, заголовки и параметры. Убедитесь, что путь к `/quote` и `/swap` корректен
- Ошибка транзакции (например, код 6024 / 0x1):
    - Недостаточно средств, просроченная квота, слишком низкий `slippageBps`, неверная приоритизационная комиссия, проблемы с ATA
- Неверные `decimals`:
    - Неправильная конвертация `humanAmount → amount` приведёт к неверной квоте или отказу сети
- Нестабильный RPC:
    - Задержки/таймауты при отправке/подтверждении; попробуйте другой провайдер RPC

#### Быстрые ссылки
- Эксплорер: `https://solscan.io`
- Документация Jupiter Lite API: `https://dev.jup.ag/docs/api/swap-api/swap`

- - -
- Вкратце: файл `solana.js` подключается к сети Solana, через Jupiter выполняет `USDT → SOL` и затем `SOL → USDT`, используя статические суммы и параметры слиппеджа/приоритетной комиссии, и логирует ссылки на `solscan`.
