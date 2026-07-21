# Gelly Hanuu - Microsoft Store Setup

## Game language
English (en-US)

## Consumable products
Create these two add-ons in Microsoft Partner Center as **Consumable** products:

1. Product ID: `gelly_hanuu_boost_5`
   - Display name: Jelly Boost
   - Suggested price: USD 5.00
   - Grants: 50 Energy + 100 Stars

2. Product ID: `gelly_hanuu_boost_10`
   - Display name: Jelly Mega Boost
   - Suggested price: USD 10.00
   - Grants: 120 Energy + 300 Stars

## Important purchase note
The included browser build uses a preview purchase mode so the buttons can be tested without charging money.
For real Microsoft Store purchases, connect the two product IDs to the Microsoft Store purchase API in the final Store host/package.

## Packaging safety
This is a static HTML5/PWA game. Do not add the restricted `runFullTrust` capability.
Before uploading the final MSIX/MSIXBundle, open AppxManifest.xml and confirm that `runFullTrust` is not present.

## Recommended package route
Use a Microsoft Store-compatible PWA/MSIX packaging workflow that keeps the app sandboxed and does not request full trust.
