# PRD - Social Voice Hub

## Visão Geral
App mobile para substituir grupo de WhatsApp com chat ao vivo, comunicação por voz (walkie-talkie) e gerenciamento de passageiros Uber.

## Funcionalidades Implementadas

### 1. Autenticação
- **Login com Google** via Emergent Auth
- Sessão persistente de 7 dias com expo-secure-store
- Logout automático em caso de token inválido

### 2. Chat ao Vivo
- Mensagens de texto em tempo real via Socket.IO
- **Sem histórico** - mensagens não são salvas no banco
- Avatar e nome do remetente em cada mensagem
- Indicador de status conectado/desconectado
- Auto-scroll para nova mensagem
- Contador de membros online

### 3. Walkie-Talkie (Voz)
- Push-to-talk com botão grande de microfone
- Indicador visual quando alguém está falando
- Feedback háptico ao iniciar/parar gravação
- Broadcast de áudio para todos os membros do grupo

### 4. Lista de Passageiros Uber
- CRUD pessoal de passageiros (cada usuário tem sua lista)
- **Data automática** registrada do dispositivo no momento da criação
- Exclusão com confirmação
- Modal de adição com bottom sheet

## Funcionalidade Removida (Temporariamente)
- ⚠️ **Live Map com geolocalização**: Removido devido à incompatibilidade do `react-native-maps` com a plataforma web. Pode ser adicionado de volta em uma versão mobile-only.

## Arquitetura

### Backend (FastAPI + Socket.IO + MongoDB)
- **Endpoints REST** (`/api/*`):
  - `POST /api/auth/session` - Criar sessão Google OAuth
  - `GET /api/auth/me` - Obter usuário atual
  - `POST /api/auth/logout` - Fazer logout
  - `GET /api/passengers` - Listar passageiros
  - `POST /api/passengers` - Criar passageiro
  - `DELETE /api/passengers/{id}` - Excluir passageiro

- **Socket.IO Events** (`/api/socket.io`):
  - `join_group` - Usuário entra no grupo
  - `send_message` / `new_message` - Chat de texto
  - `start_talking` / `stop_talking` / `user_talking` - Walkie-talkie status
  - `voice_data` / `voice_stream` - Streaming de áudio
  - `user_joined` / `user_disconnected` - Notificações de conexão

### Frontend (Expo + React Native)
- **Tab Navigation**: Chat | Passageiros
- **Storage seguro**: expo-secure-store para tokens
- **Real-time**: socket.io-client com path `/api/socket.io`
- **Audio**: expo-av para gravação/reprodução

### Database (MongoDB)
- `users` - Perfis de usuários (email único)
- `user_sessions` - Tokens de sessão com TTL automático de 7 dias
- `passengers` - Lista de passageiros por usuário

## Stack Técnica
- **Backend**: FastAPI, python-socketio, motor (MongoDB async), httpx
- **Frontend**: Expo SDK 54, React Native, expo-router, socket.io-client
- **Auth**: Emergent Google OAuth
- **Database**: MongoDB com índices TTL

## Próximas Iterações Sugeridas
1. Adicionar mapa interativo (versão mobile-only)
2. Push notifications quando alguém envia mensagem
3. Implementar streaming de áudio chunks para walkie-talkie verdadeiramente em tempo real
4. Adicionar fotos de perfil personalizadas
5. Compartilhamento de imagens no chat
