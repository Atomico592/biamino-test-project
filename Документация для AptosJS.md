### Документация к файлу `aptos.js`

#### Назначение
Скрипт выполняет два последовательных свопа через Pontem LiquidSwap на сети Aptos:
1) USDT → APT на сумму 1 USDT
2) APT → USDT на сумму 0.1 APT

По завершении каждого свопа выводится ссылка на транзакцию в `https://aptoscan.com`.

#### Зависимости
- `Node.js` 18+
- Пакеты: `aptos`, `@pontem/liquidswap-sdk`, `dotenv`
- Тип модулей в проекте: `type: "module"` (см. `package.json`)

#### Переменные окружения
Создайте `.env` в корне проекта:
```env
RPC_APT_URL=...         # RPC-узел сети Aptos
WALLET_KEY_APTOS=...    # Приватный ключ в hex (без 0x), для создания AptosAccount
```

- `RPC_APT_URL`: валидный RPC-ендпойнт Aptos (например, публичный провайдер или собственный нод).
- `WALLET_KEY_APTOS`: приватный ключ аккаунта в шестнадцатеричном виде; на кошельке должен быть APT для оплаты газа.

#### Адреса и используемые ресурсы (сеть Aptos)
- Типы токенов (type tags):
  - `APT`: `0x1::aptos_coin::CoinInfo<0x1::aptos_coin::AptosCoin>`
  - `USDT`: `0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::CoinInfo<0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T>`
- SDK: `@pontem/liquidswap-sdk` (модули `SDK`, `convertValueToDecimal`)
- Эксплорер транзакций: `https://aptoscan.com`

#### Логика работы
- Инициализация:
  - Загружается `RPC_APT_URL` и `WALLET_KEY_APTOS` из `.env`
  - Приватный ключ конвертируется из hex в `Uint8Array`, создаётся `AptosAccount`
  - Инициализируется `sdk = new SDK({ nodeUrl: RPC_APT_URL })`
- `swapTokens(fromToken, toToken, amount, decimals)`:
  - Запрашивает котировку: `sdk.Swap.calculateRates({ fromToken, toToken, amount: convertValueToDecimal(amount, decimals), curveType: "uncorrelated", interactiveToken: "from", version: 0 })`
  - Формирует payload: `sdk.Swap.createSwapTransactionPayload({ fromToken, toToken, fromAmount, toAmount: rate.toAmount, slippage: 0.005, curveType: "uncorrelated", stableSwapType: "high", version: 0 })`
  - Генерирует, подписывает и отправляет транзакцию через Aptos client, ждёт подтверждения
  - Логирует ссылку вида `https://aptoscan.com/txn/<hash>`
- `main()` выполняет два свопа по очереди:
  - `USDT → APT` на `1 USDT` (decimals: 6)
  - `APT → USDT` на `0.1 APT` (decimals: 8)

Вывод в консоль: ссылки вида `https://aptoscan.com/txn/<hash>`.

#### Запуск
- Установите зависимости:
```bash
npm ci
```
- Заполните `.env` (см. выше).
- Запустите скрипт:
```bash
node aptos.js
```

#### Настройка под себя
- **Суммы и decimals**: меняйте аргументы `amount` и `decimals` в вызовах `swapTokens(...)`.
- **Слиппедж**: параметр `slippage` в `createSwapTransactionPayload` (по умолчанию `0.005` = 0.5%).
- **Пулы/кривые**: `curveType: "uncorrelated"`, `stableSwapType: "high"` — подстройте под желаемую ликвидность/кривую.
- **Токены**: замените type tags `fromToken`/`toToken` на нужные активы, проверьте `decimals`.
- **RPC/кошелёк**: укажите корректный `RPC_APT_URL` и приватный ключ в hex для аккаунта с балансом APT.

#### Безопасность и ограничения
- Не храните приватный ключ в репозитории; используйте `.env` и секреты CI/CD.
- На кошельке должны быть:
  - Достаточно APT для газа.
  - Достаточно баланса `USDT`/`APT` для совершаемых свопов.
- `toAmount` берётся из рассчитанной котировки; при волатильности возможен `revert`, если фактический курс ухудшится сильнее лимита слиппеджа.

#### Типичные ошибки
- `client is not defined`:
  - В скрипте используется `client.generateTransaction / signTransaction / submitTransaction`. Убедитесь, что создан экземпляр `AptosClient`: `const client = new AptosClient(RPC_APT_URL)` и он доступен в области видимости.
- Неверные `decimals` → некорректные суммы в атомарном формате.
- Неверные type tags токенов или отсутствие регистрации/ликвидности в пуле.
- Неверный `RPC_APT_URL` или нестабильный узел.
- Недостаточно APT на газ или недостаточный баланс токена.

#### Быстрые ссылки
- Эксплорер: `https://aptoscan.com`
- Pontem LiquidSwap SDK: `https://github.com/pontem-network/liquidswap-sdk`

- - -
- Вкратце: файл `aptos.js` подключается к сети Aptos, через Pontem LiquidSwap рассчитывает курс, формирует и отправляет своп-транзакцию, последовательно выполняя `USDT → APT` и `APT → USDT`, и логирует ссылки на `aptoscan`.


