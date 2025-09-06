# PostgreSQL Password Reset Guide

Since the automatic password testing didn't work, here are manual steps to reset your PostgreSQL password:

## Method 1: Using pgAdmin (Recommended)

1. Open pgAdmin (usually installed with PostgreSQL)
2. Connect to your PostgreSQL server
3. Right-click on the server and select "Properties"
4. Go to the "Connection" tab
5. You can see or change the password there

## Method 2: Manual Password Reset

1. **Stop PostgreSQL Service:**
   ```powershell
   Stop-Service postgresql-x64-17
   ```

2. **Start PostgreSQL in Single User Mode:**
   ```powershell
   & "C:\Program Files\PostgreSQL\17\bin\postgres.exe" --single -D "C:\Program Files\PostgreSQL\17\data" postgres
   ```

3. **In the PostgreSQL prompt, run:**
   ```sql
   ALTER USER postgres PASSWORD 'postgres';
   \q
   ```

4. **Restart PostgreSQL Service:**
   ```powershell
   Start-Service postgresql-x64-17
   ```

## Method 3: Check Installation Password

During PostgreSQL installation, you might have set a specific password. Common places to check:
- Installation notes
- Password manager
- System administrator

## Method 4: Use Different User

If you can't reset the postgres user, you can create a new user:
1. Use pgAdmin to create a new user
2. Grant necessary permissions
3. Update your .env file with the new user credentials

## After Resetting Password

Once you have the correct password, update your `.env` file:

```env
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_new_password
PGDATABASE=task_management
```

Then run:
```bash
npm start
```

## Alternative: Use SQLite for Development

If you continue having issues with PostgreSQL, you can temporarily switch to SQLite for development by modifying the data-source.js file.
