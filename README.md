# App Financeiro

Base para um aplicativo Android com Expo (SDK 57), React Native, TypeScript, Expo Router e Supabase.

## Requisitos

- Node.js 20+
- Conta EAS (Expo) logada: `eas whoami`
- Projeto Supabase (opcional nesta versão)

## Instalação

```bash
npm install
cp .env.example .env
```

Edite `.env` com as credenciais do seu projeto Supabase.

## Executar localmente

```bash
npm start
```

Ou diretamente no Android com o Expo Go:

```bash
npm run android
```

## Build do APK (EAS Build)

```bash
npx eas build:configure
npx eas init
eas build --platform android --profile preview
```

O build gera um APK com link de download exibido ao final do comando.

## Estrutura

```
app/          # rotas (Expo Router)
components/   # componentes de UI
services/     # serviços externos (Supabase)
hooks/        # hooks reutilizáveis
utils/        # utilitários
assets/       # ícones e imagens
```
