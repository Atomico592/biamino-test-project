### Документация к файлу `aptos.js`

#### Назначение
Скрипт выполняет два последовательных свопа через Pontem Liquidswap в сети Aptos:
1) USDT → APT на сумму 1 USDT
2) APT → USDT на сумму 0.1 APT

По завершении каждой отправки выводится ссылка на транзакцию в `https://aptoscan.com`.

#### Зависимости
- `Node.js` 18+
- Пакеты: `aptos`, `@pontem/liquidswap-sdk`, `dotenv`
- Тип модулей в проекте: `type: "module"` (см. `package.json`)

#### Переменные окружения
Создайте `.env` в корне проекта:
```env
RPC_APT_URL=...           # RPC-узел сети Aptos (обычно заканчивается на /v1)
WALLET_KEY_APTOS=...      # Приватный ключ кошелька в hex, БЕЗ префикса 0x
```

- `RPC_APT_URL`: валидный JSON-RPC эндпоинт Aptos (н-р, провайдер или собственный нод).
- `WALLET_KEY_APTOS`: приватный ключ аккаунта, совершающего свопы. На нём должен быть APT для газа.

#### Токены и используемые type tags (Aptos)
- `USDT`: `0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::T`
- `APT`: `0x1::aptos_coin::AptosCoin`
- Десятичность: USDT — 6, APT — 8

#### Логика работы
- Инициализация:
    - `AptosClient(RPC_APT_URL)`
    - `AptosAccount(new HexString(WALLET_KEY_APTOS).toUint8Array())`
    - `new SDK({ nodeUrl: RPC_APT_URL })`
- Параметры свопов:
    - `USDT_AMOUNT = 1` (переводится в атомарный формат с учётом `USDT_DECIMALS = 6`)
    - `APT_AMOUNT = 0.1` (учитывает `APT_DECIMALS = 8`)
    - Утилита `toUnits(amount, decimals)` преобразует число в `BigInt` атомарного количества
- Формирование транзакций свопа:
    - `sdk.Swap.createSwapTransactionPayload({ fromToken, toToken, fromAmount, slippage: 0.005, interactiveToken: 'from', curveType: 'uncorrelated', version: 0 })`
    - Для USDT → APT используется `fromToken = USDT`, `toToken = APT`
    - Для APT → USDT наоборот
- Отправка и подтверждение:
    - `client.generateTransaction(account.address(), txPayload)`
    - `client.signTransaction(account, rawTxn)`
    - `client.submitTransaction(signedTxn)`
    - `client.waitForTransaction(hash)` — ожидание подтверждения после печати ссылки

#### Вывод в консоль
Логи вида:
```
https://aptoscan.com/transaction/<tx_hash>
```

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
- **Суммы**: измените `USDT_AMOUNT` и/или `APT_AMOUNT`, а также соответствующие `*_DECIMALS` при замене токенов.
- **Проскальзывание**: параметр `slippage: 0.005` соответствует 0.5%. Увеличьте/уменьшите при необходимости.
- **Кривая пула**: `curveType: 'uncorrelated'` подходит для «некоррелированных» активов. Для стейбл-стейбл пар используйте профиль, подходящий для «коррелированных» активов.
- **Токены**: при замене токенов укажите корректные `type tags` и десятичность.
- **RPC**: используйте быстрый и стабильный RPC для снижения латентности и ошибок.

#### Безопасность и ограничения
- Не храните приватный ключ в репозитории. Используйте `.env` и секреты CI/CD.
- На аккаунте должны быть:
    - APT для оплаты газа;
    - Достаточные балансы соответствующих токенов.
- Для некоторых токенов перед первым использованием требуется регистрация `CoinStore` на аккаунте.
- Значение `slippage` фиксированное и не учитывает текущие котировки; при волатильности возможен невыгодный курс или отказ свопа.

#### Типичные ошибки
- Неверный `RPC_APT_URL` (или отсутствует суффикс `/v1`).
- Пустой/неверный `WALLET_KEY_APTOS` (ожидается hex без `0x`).
- Недостаточно APT на газ или недостаточный баланс токена для свопа.
- Неверные `type tags` токенов либо неверная десятичность при конвертации в атомарный формат.
- Отсутствует регистрация `CoinStore` для токена.

#### Быстрые ссылки
- Эксплорер транзакций: `https://aptoscan.com`
- Методы SDK: `SDK.Swap.createSwapTransactionPayload`
- Клиент Aptos: `generateTransaction` / `signTransaction` / `submitTransaction` / `waitForTransaction`
