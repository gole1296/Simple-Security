# Operations Guide

This guide covers day-to-day use of the app after managed solution deployment.

## Functional areas in the app

- System Users - List of users. Details include assigned and inherited security roles, column profiles, and assigned teams
- Teams - List of all teams in your environment, with detailed views or users and role/security profiles
- Security Roles - List of security roles (default and custom) with detailed views into related teams, users, and permissions
- Field Security Profiles - List of Column Security profiles with detailed views into related teams, users, and permissions
- Security Actions - Custom table that stores action taken in the app to associate and disassociate security records with date and user stamps
- Reports - Configurable and exportable reports on security setup in the environment

## Standard operating flow

1. Select a principal (user, team, security role, column security profile).
2. Click on "Manage" to open action window
3. Choose a user/team/role/profile to associate or remove from the principal
4. Confirm associate/disassociate directly in manage window and/or through Security Actions table

## What is written to audit (ope_securityactions)

Every submitted action produces a row in `ope_simplesecurityactions` that includes:

- Operation type
- Principal type and identifier
- Related entity type and identifier
- Processing status
- Error/message details when applicable
