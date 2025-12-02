# Suspicious‑Pose‑Interface

## Quick start

```bash
# Install backend dependencies  
pip install -r requirements.txt  

# Install frontend dependencies  
npm i  
```

Password (for login / demo): **john‑erick**

## Running

Open two terminals:

- In the first terminal, start the frontend:  
  ```bash
  npm run dev
  ```

- In the second terminal, start the backend / API:  
  ```bash
  npm run api
  ```

## What it does

A simple interface for pose‑based detection / annotation.  
Frontend serves the UI, backend handles the API and data / database.


## Note
**Reminder:** In `api.py` on line 28, update the variable  
`RSTP_ADDRESS=""`  
to correct the RSTP address provided in the user manual.