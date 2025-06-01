# AI-Powered Web3 Portfolio Assistant

## Introduction

The **AI-Powered Web3 Portfolio Assistant** project is an intelligent chatbot designed to help users effectively manage their Web3 portfolios. By leveraging the power of Artificial Intelligence (AI), this chatbot is capable of analyzing your wallet activity on the SUI blockchain and providing insightful advice on risk management, staking opportunities, and specific position analyses.

## Core Idea

An AI chatbot that can understand and analyze a user's transaction history and wallet activity on the blockchain. A Large Language Model (LLM) will analyze on-chain data and answer user questions, providing advice on:
-   **Efficient Gas Usage:** Optimizing transaction costs.
-   **Staking Opportunities:** Suggesting potential staking opportunities to maximize returns.
-   **Portfolio Risk Analysis:** Assessing the overall risk of the investment portfolio.
-   **Position Analysis:** Evaluating specific positions in liquidity pools, checking liquidation risks, and offering management advice.

## Features

-   **Intent Detection:** The AI can identify the user's intent from messages to provide appropriate responses (e.g., greetings, portfolio risk analysis, position analysis).
    (Reference: `src/services/chatService.ts` startLine: 62 endLine: 96)
-   **Portfolio Risk Analysis:** Evaluates the total asset value and 24-hour price changes of tokens in the wallet to provide advice on asset allocation to minimize risk and optimize profits.
    (Reference: `src/services/chatService.ts` startLine: 135 endLine: 197)
-   **Positions Analysis:** Provides detailed information about positions in liquidity pools, including `inRange` status, equity, debt, margin level, liquidation price, and interest rates, while offering management advice based on price fluctuations.
    (Reference: `src/services/chatService.ts` startLine: 216 endLine: 390)
-   **General AI Response:** Handles general queries that do not fall under specific intents.
    (Reference: `src/services/chatService.ts` startLine: 104 endLine: 127)
-   **SUI Blockchain Integration:** Interacts with the SUI blockchain to retrieve wallet balance data and position information.
    (Used in `src/services/chatService.ts` via `@mysten/sui/client` and `@kunalabs-io/kai`)
-   **DEX Screener Integration:** Fetches hourly price change data (24h, 6h) from DEX Screener to support analysis.
    (Used in `src/services/chatService.ts` `analyzePortfolioRisk` and `getPositionInfo`)

## Technologies Used

-   **Backend:** Node.js, Express.js
-   **Database:** MongoDB (via Mongoose)
-   **AI/LLM:** OpenAI API (using `gpt-4.1-nano-2025-04-14` model)
-   **Blockchain Interaction:** `@mysten/sui/client`, `@kunalabs-io/kai`
-   **HTTP Client:** Axios
-   **Environment Management:** Dotenv
-   **Language:** TypeScript
-   **Development Tools:** Nodemon, tsx, tsconfig-paths

## Setup and Running the Project

To set up and run the project on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <your_repo_address>
    cd sui-hackathon-be
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    Create a `.env` file in the project root directory and add the following variables:
    ```
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    OPENAI_API_KEY=your_openai_api_key
    ```
    -   `MONGO_URI`: Your MongoDB connection string.
    -   `OPENAI_API_KEY`: Your OpenAI API key to access AI services.

4.  **Database Connection:**
    The project uses MongoDB. Ensure that your `MONGO_URI` in the `.env` file is correct.
    (Reference: `src/configs/db.ts`)

5.  **Run the application:**
    To run the application in development mode (with hot-reloading):
    ```bash
    npm run dev
    ```
    The server will run on the port specified in your `.env` file (default is 5000).

## API Usage

The project provides an API for interacting with the AI chatbot.

### Main Endpoint

-   **`POST /v1/chat`** 
   use for chat with AI assistant
   -   **Request Body (JSON):**
        ```json
        {
          "message": "Can you analyze my portfolio risk?"
        }
        add `walletAddress` to header as well
        ```

## Project Structure

```
.
├── src/
│   ├── configs/          # Application configurations (e.g., DB connection)
│   │   └── db.ts
│   ├── controllers/      # Handles request/response logic from routers
│   │   └── chatController.ts
│   ├── middlewares/      # Middleware functions (error handling, custom response)
│   │   ├── app/
│   │   │   └── customResponse.ts
│   │   └── e/
│   │       ├── AppError.ts
│   │       ├── ErrorCode.ts
│   │       └── ErrorMessages.ts
│   ├── routers/          # Defines API routes
│   │   ├── chatRouter.ts
│   │   └── index.ts
│   ├── services/         # Contains core business logic, interacts with AI/Blockchain
│   │   └── chatService.ts
│   ├── types/            # Defines TypeScript data types
│   │   └── chat.ts
│   └── index.ts          # Entry point of the Express application
├── .env                  # Environment variables (should not be committed)
├── package.json          # Project information and dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Contributing

All contributions are welcome! If you have any suggestions for improvements or find any bugs, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the ISC License.