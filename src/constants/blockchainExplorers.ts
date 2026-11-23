/*
 * SPDX-FileCopyrightText: 2024 ZecHub contributors
 * SPDX-License-Identifier: MIT
 */

/**
 * List of blockchain explorers used throughout the ZecHub documentation.
 * Each explorer provides a name, URL, light/dark mode logos, and a short description.
 */
export interface Explorer {
  /** Human‑readable name of the explorer */
  name: string;
  /** Base URL of the explorer */
  url: string;
  /** Path to the light‑mode logo (relative to the public assets folder) */
  lightLogo: string;
  /** Path to the dark‑mode logo (relative to the public assets folder) */
  darkLogo: string;
  /** Short description displayed alongside the explorer */
  description: string;
}

export const BLOCKCHAIN_EXPLORERS: Explorer[] = [
  {
    name: "Blockchair",
    url: "https://blockchair.com/zcash",
    lightLogo: "/assets/blockchainExplorers/blockchair-light.png",
    darkLogo: "/assets/blockchainExplorers/blockchair-dark.png",
    description: "Blockchair – multi‑currency blockchain explorer"
  },
  {
    name: "ZEC Explorer",
    url: "https://explorer.zcha.in",
    lightLogo: "/assets/blockchainExplorers/zec-explorer-light.png",
    darkLogo: "/assets/blockchainExplorers/zec-explorer-dark.png",
    description: "Official Zcash explorer"
  },
  {
    name: "ZEC Wallet",
    url: "https://wallet.zecwallet.co",
    lightLogo: "/assets/blockchainExplorers/zec-wallet-light.png",
    darkLogo: "/assets/blockchainExplorers/zec-wallet-dark.png",
    description: "ZEC Wallet – web‑based explorer and wallet"
  },
  // New explorer added below
  {
    name: "AtlasZEC",
    url: "https://www.atlaszec.com",
    lightLogo: "/assets/blockchainExplorers/atlaszec-light.png",
    darkLogo: "/assets/blockchainExplorers/atlaszec-dark.png",
    description: "AtlasZEC – a fast, privacy‑preserving Zcash explorer"
  }
];

export default BLOCKCHAIN_EXPLORERS;
