# Salesforce CPQ Tool

A modern CPQ (Configure, Price, Quote) tool that integrates with Salesforce to create and manage quotes.

## Project Structure

```
cpq-tool/
├── public/          # Static frontend files
├── src/            # Source files
└── worker/         # Cloudflare Worker backend
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Salesforce Connected App:
- Create a new Connected App in Salesforce
- Enable OAuth Settings
- Set callback URL to your deployment URL
- Note the Client ID and Secret

3. Configure environment variables:
```bash
# In worker/.dev.vars for local development
SF_CLIENT_ID="your_client_id"
SF_CLIENT_SECRET="your_client_secret"
```

## Development

Run the development server:
```bash
npm run dev
```

This will start:
- Frontend at http://localhost:8080
- Worker at http://localhost:8787

## Deployment

1. Deploy the Worker:
```bash
npm run deploy:worker
```

2. Deploy to Pages:
```bash
npm run deploy:pages
```

## Features

- OAuth 2.0 authentication with Salesforce
- Account search
- Price book integration
- Quote creation and management
- Real-time calculations
