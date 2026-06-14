# Ahmed Account Manager

A local static website for organizing Overwatch, Valorant, and ARC Raiders accounts.

## Usage

Open `index.html` in a browser. Account data and uploaded images are saved locally in the browser with `localStorage`.

## Notes

- Each game has a separate account board.
- New accounts start as `Not Delivered`.
- When an account is marked `Delivered`, its price is added to the bright green amount due on the home screen.
- Deleted accounts move to the red `Deleted Accounts` button under `Add Account` and no longer count toward the amount due.
