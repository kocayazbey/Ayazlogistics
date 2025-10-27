# AyazLogistics Driver Mobile App

React Native mobile application for delivery drivers.

## Features

- 📋 View daily tasks and deliveries
- 🗺️ Real-time GPS navigation
- ✅ Mark tasks as complete
- 📸 Photo proof of delivery
- 💬 Real-time communication
- 📊 Performance tracking

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Tech Stack

- React Native (Expo)
- React Navigation
- Socket.io (real-time)
- React Native Maps
- Axios

## API Integration

Base URL: `http://localhost:3000/api/v1`

### Endpoints Used
- `GET /tms/driver/tasks` - Get driver tasks
- `POST /tms/driver/tasks/:id/complete` - Mark task complete
- `POST /tracking/location` - Update location
- WebSocket: `/tracking` - Real-time updates

