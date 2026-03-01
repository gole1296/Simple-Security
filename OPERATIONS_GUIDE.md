# Operations Guide

## Purpose

This guide covers day-to-day use of the app after managed solution deployment.

## Functional areas in the app

- User and Team selection
- Role assignment and removal
- Team membership maintenance
- Field security profile assignment and removal
- Action status and history review
- Basic report/export workflows

## Standard operating flow

1. Select a principal (user or team).
2. Select target entity (role, team, or profile).
3. Choose **associate** or **disassociate** action.
4. Submit action.
5. Confirm action history reflects the request and final status.

## What is written to audit

Every submitted action produces a row in `ope_simplesecurityactions` that includes:

- Operation type
- Principal type and identifier
- Related entity type and identifier
- Processing status
- Error/message details when applicable

## Monitoring queue health

Review action records periodically for:

- Pending actions older than expected processing window
- Repeated failures for the same principal/entity pair
- Validation or permission errors indicating role misconfiguration

## Safe operating practices

- Execute sensitive removals in small batches.
- Validate critical role removals with a second approver.
- Avoid high-volume changes during other platform maintenance windows.

## Export and evidence

When required for audits:

- Export action history/report output from the app.
- Store export with release ticket or compliance record.
- Include solution version and execution window metadata.
