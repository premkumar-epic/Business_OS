# Business OS

A comprehensive, client-centric Business Operating System designed to streamline invoicing, shipments, and customer ledgers. This software is built dynamically to connect directly to a client's database (Supabase), ensuring all data and operations are self-contained, secure, and easily accessible across environments.

## Overview

Business OS is designed as a portable, plug-and-play architecture. By supplying a Supabase connection, the application automatically handles the schema, manages state, and provides a beautiful, modern interface for day-to-day business operations. 

It acts as a centralized dashboard for generating professional invoices, tracking payment ledgers, and maintaining detailed shipment logs without hardcoding business logic to a single vendor.

## Existing Features

* **Smart Invoicing System**: Create, edit, and print professional invoices. Includes dynamic tax (GST) calculation on total amounts, custom discount inputs, and flexible PDF/Print views.
* **Customer Ledger & Balances**: Keep track of customer advances and outstanding balances with visual color-coded indicators.
* **Shipment & Delivery Logs**: Centralized logging system to track physical shipments, automatically grouping them by month. Built with crash-safe date parsing.
* **Payment Allocation (FIFO)**: Intelligent bulk payment processing that automatically clears older invoices first (FIFO) and updates the ledger.
* **Dynamic Database Sync**: Directly connects to your Supabase project. Automatically verifies schema columns and nests unsupported data fields inside JSONB to prevent application crashes.
* **Premium UI/UX**: Built with React and glassmorphism design principles, delivering a stunning, responsive, and intuitive user experience.
* **Secure Access**: Simple, fast passcode-based authentication for quick internal team access.

## Upcoming Features

* **JWT Authentication & Roles**: Robust username/password login system with Role-Based Access Control (Admin, Staff, Read-Only).
* **Advanced Analytics & Export**: Deeper insights into revenue, top customers, and one-click exports to CSV/Excel for accounting.
* **Custom Invoice Numbering**: Configurable invoice prefixes and sequences.
* **Multi-Branch Support**: Easily toggle between different store branches or physical locations from a single dashboard.

## Tech Stack

* **Frontend**: React, Vite
* **Styling**: Vanilla CSS (Modern aesthetic, Glassmorphism, Responsive)
* **Backend / Database**: Supabase (PostgreSQL)
* **Deployment (CI/CD)**: Optimized for Vercel with automated branch environments (`production`, `beta`, `development`).

## Getting Started

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Create a `.env` file with your database credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run `npm run dev` to start the local development server.
