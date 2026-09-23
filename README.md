# Renata Oncology Quiz (Next.js)

```bash
npm install
npm run dev          # http://localhost:3000
# production:  npm run build && npm start
```

## Where the data goes
Every player is saved to **`data/participants.xlsx`** (sheet "Participants"):
ID · Date & Time · Name · Phone · Score (first try, /3) · Total Attempts · Status.
A row is added when the player registers (Status = Registered) and the same row is
updated with the score when they finish (Status = Completed).

Download the sheet any time (works even while the server is running):

    http://localhost:3000/api/export?key=<ADMIN_KEY>

`ADMIN_KEY` is in `.env.local`. Change it, and optionally set `XLSX_PATH` to store the file elsewhere.

Tip: download via `/api/export` rather than opening `data/participants.xlsx` directly —
Excel locks an open file and the server would not be able to save new players.

## Deploying
The Excel file is written to the server's disk, so host it on a machine/VM with a
persistent disk (or set `XLSX_PATH` to a mounted volume). Serverless hosts such as
Vercel have a read-only, temporary filesystem and will not keep the file.

## Offline Windows app
    npm run package:win

Creates `dist/RenataQuiz/` (~150 MB). Copy that whole folder to any Windows PC (no Node or
internet needed) and double-click **RenataQuiz.exe**: it starts the server and opens the quiz
in the browser. Players are saved to `RenataQuiz/data/participants.xlsx`. Close the console
window to stop. Re-running `package:win` keeps the existing `data/` folder.
