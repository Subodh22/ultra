# Supabase Storage Setup Instructions

After running the main schema.sql, follow these steps to set up file storage:

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Configure:
   - **Name**: `notes`
   - **Public bucket**: ❌ Leave **unchecked** (private)
   - Click **Create bucket**

## Step 2: Set Up Storage Policies

1. In Storage, click on the **notes** bucket
2. Click **Policies** tab at the top
3. Click **New policy**

### Policy 1: Upload Files
- Click **Create policy from scratch**
- **Policy name**: `Users can upload their own notes`
- **Policy command**: INSERT
- **Target roles**: authenticated
- **USING expression**: Leave empty
- **WITH CHECK expression**:
```sql
bucket_id = 'notes' AND (storage.foldername(name))[1] = auth.uid()::text
```
- Click **Review** then **Save policy**

### Policy 2: View Files
- Click **New policy** again
- Click **Create policy from scratch**
- **Policy name**: `Users can view their own notes`
- **Policy command**: SELECT
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'notes' AND (storage.foldername(name))[1] = auth.uid()::text
```
- **WITH CHECK expression**: Leave empty
- Click **Review** then **Save policy**

### Policy 3: Delete Files
- Click **New policy** again
- Click **Create policy from scratch**
- **Policy name**: `Users can delete their own notes`
- **Policy command**: DELETE
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'notes' AND (storage.foldername(name))[1] = auth.uid()::text
```
- **WITH CHECK expression**: Leave empty
- Click **Review** then **Save policy**

## Alternative: Quick Setup with RLS Helper

Supabase might also show a template option. If you see:
1. "Allow users to upload files" template
2. "Allow users to read files" template
3. "Allow users to delete files" template

You can use these and modify the conditions to match your bucket name.

## Step 3: Verify Setup

After creating the policies, you should see 3 policies listed:
- ✅ Users can upload their own notes (INSERT)
- ✅ Users can view their own notes (SELECT)
- ✅ Users can delete their own notes (DELETE)

## Done!

Your storage is now configured and the app will be able to:
- ✅ Upload notes to storage
- ✅ Process them with AI
- ✅ Create flashcards

Return to your app at http://localhost:3000 and try uploading a note!

