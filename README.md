# Ahmed Account Manager

A local static website for organizing Overwatch, Valorant, and ARC Raiders accounts.

## Usage

Open `index.html` in a browser. Account data and uploaded images are saved locally in the browser with `localStorage`.

## Notes

- Each game has a separate account board.
- New accounts start as `Not Delivered`.
- When an account is marked `Delivered` or `Sold`, its price is added to the bright green amount due on the home screen.
- `Sold` has its own column so you can organize accounts without changing the amount due when you move a delivered account there.
- Deleted accounts move to the red `Deleted Accounts` button under `Add Account` and no longer count toward the amount due.
- Each account has an `Offer Description` that appears on the card, and accounts can be edited later.
- On Vercel, accounts sync through Supabase when the environment variables are configured.

## Supabase Setup

Run `supabase-setup.sql` once in the Supabase SQL Editor.

Add these Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The app also accepts `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Never add the Supabase `service_role` key to this project.
